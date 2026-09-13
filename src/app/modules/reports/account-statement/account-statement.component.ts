import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { BudgetService } from '../../budgets/services/budget.service';
import { CustomerService } from '../../customers/services/customer.service';
import { CompanyService } from '../../configurations/services/company.service';
import { PaymentService } from '../../payments/services/payment.service';
import { PaymentTransferService } from '../../payments/services/payment-transfer.service';
import { PaymentModel, CreatePaymentTransferRequest, PaymentTransferAllocation, PaymentTransferModel } from '../../payments/models/payment.Model';
import { BudgetModel } from '../../budgets/models/budget.Model';
import { CustomerModel } from '../../customers/models/customer.Model';
import { NgxSpinnerService } from 'ngx-spinner';
import { BUDGET_ESTADOS } from '../../../shared/constants';
import { buildAccountStatementPdf, accountStatementFileName } from './account-statement-pdf';
import { DataTableColumn } from '../../../shared/ui/data-table/data-table.types';
import * as cartera from './account-statement.calculations';
import { MovementKind } from './account-statement.calculations';
import { PortfolioCustomerRow } from './portfolio-dashboard/portfolio-dashboard.models';

/** Tipo de movimiento que descuenta saldo de una cotización facturada. */
export { MovementKind };

/** Borrador del formulario de "registrar movimiento" de una fila. */
interface MovementDraft {
  kind: MovementKind;
  amount: number | null;
  note: string;
  date: Date;
}

/**
 * Un color por tramo de antigüedad. Mismos valores que `$dc-primary`,
 * `$dc-primary-light`, `$dc-adjust` y `$dc-debt` y que los del dashboard: la
 * franja del ledger y los puntos de la tabla se pintan con estilos en línea,
 * así que el color tiene que existir también en TypeScript.
 */
const AGING_COLORS: Readonly<Record<cartera.AgingBucket, string>> = {
  '0-30': '#6d28d9',
  '31-60': '#a78bfa',
  '61-90': '#b45309',
  '+90': '#c0392b',
};

/** Etiqueta corta de cada tramo, para la leyenda de la franja y la tabla. */
const AGING_SHORT_LABELS: Readonly<Record<cartera.AgingBucket, string>> = {
  '0-30': '0–30',
  '31-60': '31–60',
  '61-90': '61–90',
  '+90': '+90',
};

/** Un tramo de la franja de antigüedad del ledger. */
interface AgingSegment {
  bucket: cartera.AgingBucket;
  label: string;
  color: string;
  amount: number;
  percent: number;
}

@Component({
  selector: 'app-account-statement',
  templateUrl: './account-statement.component.html',
  styleUrls: ['./account-statement.component.scss']
})
export class AccountStatementComponent implements OnInit {
  private budgetService = inject(BudgetService);
  private customerService = inject(CustomerService);
  private companyService = inject(CompanyService);
  private paymentService = inject(PaymentService);
  private paymentTransferService = inject(PaymentTransferService);
  private messageService = inject(MessageService);
  private spinner = inject(NgxSpinnerService);

  customers = signal<CustomerModel[]>([]);
  budgets = signal<BudgetModel[]>([]);
  selectedCustomer = signal<CustomerModel | null>(null);
  companyInfo = signal<any>(null);
  loadingBudgets = signal<boolean>(false);

  /** Movimientos (abonos y ajustes) indexados por cotización. */
  movementsByBudget = signal<Map<number, PaymentModel[]>>(new Map());

  estadoOptions = BUDGET_ESTADOS;
  currentStatementBudget: BudgetModel | null = null;

  // Feedback de guardado inline (mismo patrón que el listado de cotizaciones).
  savingInvoiceId: number | null = null;
  savedInvoiceId: number | null = null;
  savingStatusId: number | null = null;
  savedStatusId: number | null = null;
  savingMovementBudgetId: number | null = null;
  private readonly savedCheckDurationMs = 1400;

  // Edición inline de la factura.
  editingInvoiceBudgetId: number | null = null;
  editingInvoiceValue = '';
  private originalInvoiceValue = '';

  // Edición inline de un movimiento (abono/ajuste) ya guardado.
  editingMovementId: number | null = null;
  editingMovementDraft: MovementDraft | null = null;
  savingMovementId: number | null = null;

  // Formulario único de "registrar transferencia".
  transferDialogVisible = signal(false);
  transferTotal = signal<number | null>(null);
  transferDate: Date = new Date();
  transferNote = '';
  transferAllocations = signal<Map<number, number | null>>(new Map());
  savingTransfer = signal(false);
  transferDetailVisible = signal(false);
  transferDetail = signal<PaymentTransferModel | null>(null);

  /**
   * Transferencias ya resueltas, por id.
   *
   * El pago solo trae `transferId`; el valor y la fecha viven en la transferencia.
   * Se piden UNA vez por transferencia distinta del cliente (no una por fila del
   * panel de movimientos) y se reutilizan tanto en la pastilla como en el diálogo
   * de detalle. Ver `ensureTransfersLoaded`.
   */
  private transfersById = signal<Map<number, PaymentTransferModel>>(new Map());
  /** Peticiones en vuelo, para no pedir dos veces la misma transferencia. */
  private transfersInFlight = new Set<number>();

  /** Borradores del formulario de movimiento, uno por cotización. */
  private drafts = new Map<number, MovementDraft>();

  tableColumns: DataTableColumn[] = [
    { field: 'internalCode', header: 'Código', width: '96px' },
    { field: 'date', header: 'Fecha', width: '118px' },
    { field: 'budgetName', header: 'Obra' },
    { field: 'externalInvoice', header: 'Factura', width: '132px' },
    { field: 'antiguedad', header: 'Antigüedad', width: '118px' },
    { field: 'estado', header: 'Estado', width: '150px' },
    { field: 'total', header: 'Facturado', align: 'right', width: '132px' },
    { field: 'movimientos', header: 'Abonos y ajustes', align: 'right', width: '150px' },
    { field: 'saldo', header: 'Saldo', align: 'right', width: '150px' },
  ];

  // ---------------------------------------------------------------- datos

  ngOnInit(): void {
    this.loadCustomers();
    this.loadBudgets();
    this.loadCompanyInfo();
  }

  loadCustomers(): void {
    this.customerService.get().subscribe({
      next: (res: any) => this.customers.set(res ?? []),
      error: () => this.notifyError('No se pudieron cargar los clientes.'),
    });
  }

  loadBudgets(): void {
    this.loadingBudgets.set(true);
    this.budgetService.get().subscribe({
      next: (res: any) => {
        this.budgets.set(res ?? []);
        this.loadingBudgets.set(false);
      },
      error: () => {
        this.loadingBudgets.set(false);
        this.notifyError('No se pudieron cargar las cotizaciones.');
      },
    });
  }

  /** Carga los movimientos del cliente seleccionado y los indexa por cotización. */
  private loadMovementsFor(customerId: number): void {
    this.paymentService.getByCustomerId(customerId)
      .pipe(catchError(() => of([])))
      .subscribe((payments: any) => {
        this.movementsByBudget.set(this.indexMovements(payments ?? []));
        this.ensureTransfersLoaded(payments ?? []);
      });
  }

  /**
   * Resuelve el valor y la fecha de las transferencias que aparecen en los
   * movimientos del cliente.
   *
   * El backend no devuelve esos datos dentro del pago (`PaymentDTO` solo trae
   * `TransferId`) y no hay endpoint que liste las transferencias de un cliente,
   * así que hay que preguntar por cada transferencia. El coste se acota
   * deduplicando: una petición por transferencia DISTINTA del cliente, no una
   * por fila ni una por cada vez que se despliega un panel. Los movimientos sin
   * transferencia y los ya cacheados no piden nada.
   */
  private ensureTransfersLoaded(payments: PaymentModel[]): void {
    const pending = new Set<number>();
    for (const payment of payments) {
      const id = payment?.transferId;
      if (!id) continue;
      if (this.transfersById().has(id) || this.transfersInFlight.has(id)) continue;
      pending.add(id);
    }

    for (const id of pending) {
      this.transfersInFlight.add(id);
      this.paymentTransferService.getById(id)
        .pipe(catchError(() => of(null)))
        .subscribe((detail: PaymentTransferModel | null) => {
          this.transfersInFlight.delete(id);
          // Sin detalle la pastilla se queda en "Transferencia #N": se degrada,
          // no se rompe. No se avisa al usuario por un dato decorativo.
          if (!detail) return;
          this.transfersById.update(map => new Map(map).set(id, detail));
        });
    }
  }

  loadCompanyInfo(): void {
    this.companyService.getCompanyByUser().subscribe({
      next: (res: any) => this.companyInfo.set(res),
      error: () => { /* el PDF avisa si falta la empresa */ },
    });
  }

  private indexMovements(payments: PaymentModel[]): Map<number, PaymentModel[]> {
    return cartera.indexMovementsByBudget(payments);
  }

  // -------------------------------------------------------------- cálculo
  //
  // La aritmética vive en `account-statement.calculations.ts` (funciones puras);
  // aquí solo quedan los envoltorios que consume la plantilla.

  /**
   * Solo cotizaciones del cliente en estado Facturada: son las únicas que
   * generan cobro. Antes se incluían Aprobada/En Desarrollo/Pagada, lo que
   * inflaba el total adeudado.
   */
  filteredBudgets = computed(() => {
    const customer = this.selectedCustomer();
    if (!customer) return [];
    return cartera.billedBudgetsOf(this.budgets(), customer.customerId);
  });

  movementsFor(budgetId: number): PaymentModel[] {
    return cartera.movementsFor(this.movementsByBudget(), budgetId);
  }

  /** Un movimiento es ajuste si su tipo menciona ajuste/retención/impuesto. */
  kindOf(movement: PaymentModel): MovementKind {
    return cartera.kindOf(movement);
  }

  abonosFor(budgetId: number): number {
    return cartera.abonosFor(this.movementsByBudget(), budgetId);
  }

  ajustesFor(budgetId: number): number {
    return cartera.ajustesFor(this.movementsByBudget(), budgetId);
  }

  /** Lo aplicado a la factura: abonos reales + ajustes (impuestos retenidos). */
  appliedFor(budgetId: number): number {
    return cartera.appliedFor(this.movementsByBudget(), budgetId);
  }

  saldoFor(budget: BudgetModel): number {
    return cartera.saldoFor(budget, this.movementsByBudget());
  }

  /** Porcentaje cubierto de la factura, para la barra de progreso. */
  progressFor(budget: BudgetModel): number {
    return cartera.progressFor(budget, this.movementsByBudget());
  }

  isSettled(budget: BudgetModel): boolean {
    return cartera.isSettled(budget, this.movementsByBudget());
  }

  /** Días transcurridos desde la fecha de la cotización. No es mora: no hay vencimiento. */
  agingDaysFor(budget: BudgetModel): number {
    return cartera.agingDays(budget);
  }

  /** Tramo de antigüedad de la cotización: 0-30, 31-60, 61-90 o +90. */
  agingBucketFor(budget: BudgetModel): cartera.AgingBucket {
    return cartera.agingBucketOf(budget);
  }

  agingLabelFor(budget: BudgetModel): string {
    return cartera.AGING_BUCKET_LABELS[this.agingBucketFor(budget)];
  }

  totalFacturado = computed(() => cartera.totalFacturado(this.filteredBudgets()));

  totalAbonos = computed(() => cartera.totalAbonos(this.filteredBudgets(), this.movementsByBudget()));

  totalAjustes = computed(() => cartera.totalAjustes(this.filteredBudgets(), this.movementsByBudget()));

  /** Total adeudado real: facturado menos abonos y ajustes. */
  totalSaldo = computed(() =>
    this.totalFacturado() - this.totalAbonos() - this.totalAjustes()
  );

  settledCount = computed(() => cartera.settledCount(this.filteredBudgets(), this.movementsByBudget()));

  /** Saldo pendiente repartido por tramo de antigüedad, solo del cliente en pantalla. */
  agingBreakdown = computed(() =>
    cartera.saldoByAgingBucket(this.filteredBudgets(), this.movementsByBudget())
  );

  /** Cartera del cliente seleccionado: facturado, abonos, ajustes, saldo y antigüedad. */
  customerCartera = computed<cartera.CustomerCartera | null>(() => {
    const customer = this.selectedCustomer();
    if (!customer) return null;
    return cartera.carteraOfCustomer(customer, this.budgets(), this.movementsByBudget());
  });

  /** Color del tramo de antigüedad de una cotización. */
  agingColorFor(budget: BudgetModel): string {
    return AGING_COLORS[this.agingBucketFor(budget)];
  }

  /**
   * Franja de antigüedad del ledger: los cuatro tramos con su peso relativo.
   *
   * Se construye siempre con los cuatro, aunque valgan cero, para que la leyenda
   * no baile de tamaño al registrar abonos.
   */
  agingSegments = computed<AgingSegment[]>(() => {
    const breakdown = this.agingBreakdown();
    const total = cartera.AGING_BUCKETS.reduce((acc, b) => acc + breakdown[b], 0);
    return cartera.AGING_BUCKETS.map(bucket => ({
      bucket,
      label: AGING_SHORT_LABELS[bucket],
      color: AGING_COLORS[bucket],
      amount: breakdown[bucket],
      percent: total > 0 ? (breakdown[bucket] / total) * 100 : 0,
    }));
  });

  /** Cuánto del total facturado sigue pendiente, para la línea bajo el saldo. */
  saldoShareLabel = computed(() => {
    const facturado = this.totalFacturado();
    if (facturado <= 0) return '';
    const percent = (this.totalSaldo() / facturado) * 100;
    return `${percent.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} % del total facturado`;
  });

  /** Fecha del abono más reciente del cliente; `null` si aún no ha abonado nada. */
  lastPaymentDate = computed<Date | null>(() => {
    let latest: number | null = null;
    for (const movements of this.movementsByBudget().values()) {
      for (const movement of movements) {
        if (cartera.kindOf(movement) !== 'Abono') continue;
        const time = new Date(movement.paymentDate).getTime();
        if (!Number.isFinite(time)) continue;
        if (latest === null || time > latest) latest = time;
      }
    }
    return latest === null ? null : new Date(latest);
  });

  /** Valor del `<select>` de cliente: cadena, como los `value` de sus `<option>`. */
  selectedCustomerValue = computed(() => {
    const customer = this.selectedCustomer();
    return customer ? String(customer.customerId) : '';
  });

  /**
   * Texto de la pastilla de transferencia de un movimiento.
   *
   * Mientras la transferencia no se ha resuelto se muestra solo su número: es
   * información cierta, y el valor y la fecha aparecen al llegar.
   */
  transferLabelFor(movement: PaymentModel): string {
    const id = movement?.transferId;
    if (!id) return 'Sin transferencia';
    const transfer = this.transfersById().get(id);
    if (!transfer) return `Transferencia #${id}`;
    return `Transferencia #${id} · $ ${this.money(transfer.totalAmount)} del ${this.shortDate(transfer.transferDate)}`;
  }

  /** "20 mar": día y mes, sin año, como en el diseño. */
  private shortDate(value: Date | string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }).replace('.', '');
  }

  money(value: number): string {
    return (value ?? 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  // ------------------------------------------------------------- clientes

  onCustomerChange(customerId: string | number): void {
    if (!customerId) {
      this.backToDashboard();
      return;
    }
    const customer = this.customers().find(c => c.customerId === +customerId) ?? null;
    this.selectedCustomer.set(customer);
    this.resetCustomerScopedState();
    if (customer) this.loadMovementsFor(customer.customerId);
  }

  /**
   * Vuelve a la vista de cartera (el dashboard).
   *
   * No hace falta pedirle al dashboard un `load()` explícito: se muestra con
   * `*ngIf`, así que al volver se crea de nuevo y su propio `ngOnInit` recarga
   * los datos. Es justo lo que se quiere cuando el usuario acaba de registrar
   * abonos en el detalle, y el coste es una única petición al entrar.
   */
  backToDashboard(): void {
    this.selectedCustomer.set(null);
    this.resetCustomerScopedState();
  }

  /** El cliente elegido en el ranking del dashboard abre su detalle. */
  onPortfolioCustomerSelected(row: PortfolioCustomerRow): void {
    if (!row?.customerId) return;
    const customer = this.customers().find(c => c.customerId === row.customerId) ?? null;
    if (!customer) {
      this.notifyError('Ese cliente no está en la lista del selector. Recarga la pantalla e inténtalo de nuevo.');
      return;
    }
    this.onCustomerChange(customer.customerId);
  }

  /** Todo lo que depende del cliente en pantalla y no debe sobrevivir al cambio. */
  private resetCustomerScopedState(): void {
    this.movementsByBudget.set(new Map());
    this.transfersById.set(new Map());
    this.transfersInFlight.clear();
    this.cancelEditingInvoice();
    this.cancelEditingMovement();
  }

  // ------------------------------------------- autoguardado factura/estado

  startEditingInvoice(budget: BudgetModel): void {
    this.editingInvoiceBudgetId = budget.budgetId;
    const value = budget.externalInvoice && budget.externalInvoice !== '0' ? budget.externalInvoice : '';
    this.editingInvoiceValue = value;
    this.originalInvoiceValue = value;
    // El input se crea al cambiar la vista, así que hay que enfocarlo después.
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>('.ac-input-sm[data-invoice-input]');
      input?.focus();
      input?.select();
    });
  }

  cancelEditingInvoice(): void {
    this.editingInvoiceBudgetId = null;
    this.editingInvoiceValue = '';
  }

  /** Guarda la factura al salir del campo o con Enter; sin botón Guardar. */
  saveExternalInvoice(budget: BudgetModel): void {
    if (this.editingInvoiceValue === this.originalInvoiceValue) {
      this.cancelEditingInvoice();
      return;
    }
    const newValue = this.editingInvoiceValue;
    const previous = budget.externalInvoice;
    this.savingInvoiceId = budget.budgetId;
    this.cancelEditingInvoice();

    this.budgetService.updateExternalInvoice({ budgetId: budget.budgetId, externalInvoice: newValue }).subscribe({
      next: () => {
        this.savingInvoiceId = null;
        this.patchBudget(budget.budgetId, { externalInvoice: newValue });
        this.flagSaved('invoice', budget.budgetId);
        this.notifySuccess('Factura actualizada', `Cotización ${budget.internalCode}`);
      },
      error: () => {
        this.savingInvoiceId = null;
        this.patchBudget(budget.budgetId, { externalInvoice: previous });
        this.notifyError('No se pudo actualizar la factura. Inténtalo de nuevo.');
      },
    });
  }

  selectEstadoStatement(value: string): void {
    const budget = this.currentStatementBudget;
    if (!budget || budget.estado === value) return;

    const previous = budget.estado;
    this.savingStatusId = budget.budgetId;
    this.patchBudget(budget.budgetId, { estado: value });

    this.budgetService.updateStatus({ budgetId: budget.budgetId, status: value }).subscribe({
      next: () => {
        this.savingStatusId = null;
        this.flagSaved('status', budget.budgetId);
        this.notifySuccess('Estado actualizado', `Cotización ${budget.internalCode} → ${value}`);
      },
      error: () => {
        this.savingStatusId = null;
        this.patchBudget(budget.budgetId, { estado: previous });
        this.notifyError('No se pudo actualizar el estado. Inténtalo de nuevo.');
      },
    });
  }

  private patchBudget(budgetId: number, changes: Partial<BudgetModel>): void {
    this.budgets.update(list =>
      list.map(b => (b.budgetId === budgetId ? { ...b, ...changes } as BudgetModel : b))
    );
  }

  private flagSaved(field: 'invoice' | 'status', budgetId: number): void {
    if (field === 'invoice') {
      this.savedInvoiceId = budgetId;
      setTimeout(() => { if (this.savedInvoiceId === budgetId) this.savedInvoiceId = null; }, this.savedCheckDurationMs);
    } else {
      this.savedStatusId = budgetId;
      setTimeout(() => { if (this.savedStatusId === budgetId) this.savedStatusId = null; }, this.savedCheckDurationMs);
    }
  }

  // ------------------------------------------------ movimientos por factura

  draftFor(budgetId: number): MovementDraft {
    let draft = this.drafts.get(budgetId);
    if (!draft) {
      draft = { kind: 'Abono', amount: null, note: '', date: new Date() };
      this.drafts.set(budgetId, draft);
    }
    return draft;
  }

  setDraftKind(budgetId: number, kind: MovementKind): void {
    this.draftFor(budgetId).kind = kind;
  }

  setDraftAmount(budgetId: number, value: string): void {
    const parsed = Number(String(value).replace(/[^\d.-]/g, ''));
    this.draftFor(budgetId).amount = Number.isFinite(parsed) && parsed !== 0 ? parsed : null;
  }

  setDraftNote(budgetId: number, value: string): void {
    this.draftFor(budgetId).note = value;
  }

  canSubmitDraft(budgetId: number): boolean {
    const draft = this.draftFor(budgetId);
    return !!draft.amount && draft.amount > 0 && this.savingMovementBudgetId !== budgetId;
  }

  /** Registra el movimiento al confirmar; se guarda solo, sin botón Guardar global. */
  addMovement(budget: BudgetModel): void {
    if (!this.canSubmitDraft(budget.budgetId)) return;
    const draft = this.draftFor(budget.budgetId);

    const payload = {
      paymentId: 0,
      budgetId: budget.budgetId,
      companyId: 0,
      userId: 0,
      paymentType: draft.kind,
      amountPaid: draft.amount as number,
      note: draft.note ?? '',
      paymentDate: new Date(),
    };

    this.savingMovementBudgetId = budget.budgetId;
    this.paymentService.add(payload).subscribe({
      next: (created: any) => {
        this.savingMovementBudgetId = null;
        const movement: PaymentModel = { ...payload, ...(created ?? {}) } as PaymentModel;
        this.upsertMovement(budget.budgetId, movement);
        this.drafts.set(budget.budgetId, { kind: draft.kind, amount: null, note: '', date: new Date() });
        this.notifySuccess(
          draft.kind === 'Abono' ? 'Abono registrado' : 'Ajuste registrado',
          `$ ${this.money(payload.amountPaid)} en la cotización ${budget.internalCode}`
        );
      },
      error: () => {
        this.savingMovementBudgetId = null;
        this.notifyError('No se pudo registrar el movimiento. Inténtalo de nuevo.');
      },
    });
  }

  deleteMovement(budget: BudgetModel, movement: PaymentModel): void {
    if (movement.transferId) {
      this.messageService.add({
        key: 'ac-inline',
        severity: 'warn',
        summary: 'Movimiento de una transferencia',
        detail: 'Eliminar este monto puede desbalancear el total de la transferencia #' + movement.transferId,
        life: 4000,
      });
    }

    const snapshot = this.movementsFor(budget.budgetId);
    this.movementsByBudget.update(map => {
      const next = new Map(map);
      next.set(budget.budgetId, snapshot.filter(m => m.paymentId !== movement.paymentId));
      return next;
    });

    this.paymentService.delete(movement.paymentId).subscribe({
      next: () => this.notifySuccess('Movimiento eliminado', `Cotización ${budget.internalCode}`),
      error: () => {
        this.movementsByBudget.update(map => {
          const next = new Map(map);
          next.set(budget.budgetId, snapshot);
          return next;
        });
        this.notifyError('No se pudo eliminar el movimiento.');
      },
    });
  }

  startEditingMovement(movement: PaymentModel): void {
    this.editingMovementId = movement.paymentId;
    this.editingMovementDraft = {
      kind: this.kindOf(movement),
      amount: movement.amountPaid,
      note: movement.note,
      date: movement.paymentDate,
    };
  }

  cancelEditingMovement(): void {
    this.editingMovementId = null;
    this.editingMovementDraft = null;
  }

  setEditingAmount(value: string): void {
    if (!this.editingMovementDraft) return;
    const parsed = Number(String(value).replace(/[^\d.-]/g, ''));
    this.editingMovementDraft.amount = Number.isFinite(parsed) ? parsed : null;
  }

  setEditingNote(value: string): void {
    if (this.editingMovementDraft) this.editingMovementDraft.note = value;
  }

  setEditingKind(kind: MovementKind): void {
    if (this.editingMovementDraft) this.editingMovementDraft.kind = kind;
  }

  setEditingDate(value: string): void {
    if (!value || !this.editingMovementDraft) return;
    const [year, month, day] = value.split('-').map(Number);
    this.editingMovementDraft.date = new Date(year, month - 1, day);
  }

  canSaveEditingMovement(): boolean {
    return !!this.editingMovementDraft?.amount && this.editingMovementDraft.amount > 0;
  }

  saveMovement(budget: BudgetModel, movement: PaymentModel): void {
    const draft = this.editingMovementDraft;
    if (!draft || !this.canSaveEditingMovement()) return;

    if (movement.transferId) {
      this.messageService.add({
        key: 'ac-inline',
        severity: 'warn',
        summary: 'Movimiento de una transferencia',
        detail: 'Editar este monto puede desbalancear el total de la transferencia #' + movement.transferId,
        life: 4000,
      });
    }

    const payload = {
      ...movement,
      paymentType: draft.kind,
      amountPaid: draft.amount as number,
      note: draft.note ?? '',
      paymentDate: draft.date,
    };

    this.savingMovementId = movement.paymentId;
    this.paymentService.update(payload).subscribe({
      next: (updated: any) => {
        // El usuario pudo haber pasado a editar otro movimiento mientras este
        // PUT estaba en vuelo: solo tocamos el estado de edición/guardado si
        // sigue apuntando a este movimiento; el otro flujo se resuelve solo.
        if (this.savingMovementId === movement.paymentId) this.savingMovementId = null;
        this.upsertMovement(budget.budgetId, { ...payload, ...(updated ?? {}) } as PaymentModel);
        if (this.editingMovementId === movement.paymentId) this.cancelEditingMovement();
        this.notifySuccess('Movimiento actualizado', `Cotización ${budget.internalCode}`);
      },
      error: () => {
        if (this.savingMovementId === movement.paymentId) this.savingMovementId = null;
        this.notifyError('No se pudo actualizar el movimiento. Inténtalo de nuevo.');
      },
    });
  }

  private upsertMovement(budgetId: number, movement: PaymentModel): void {
    this.movementsByBudget.update(map => {
      const next = new Map(map);
      const list = [...(next.get(budgetId) ?? [])];
      const index = list.findIndex(m => m.paymentId && m.paymentId === movement.paymentId);
      if (index >= 0) list[index] = movement; else list.push(movement);
      next.set(budgetId, list);
      return next;
    });
  }

  // --------------------------------------------------- transferencia multi-factura

  openTransferDialog(): void {
    this.transferTotal.set(null);
    this.transferDate = new Date();
    this.transferNote = '';
    this.transferAllocations.set(new Map());
    this.transferDialogVisible.set(true);
  }

  closeTransferDialog(): void {
    this.transferDialogVisible.set(false);
  }

  setTransferDate(value: string): void {
    if (!value) return;
    const [year, month, day] = value.split('-').map(Number);
    this.transferDate = new Date(year, month - 1, day);
  }

  allocationFor(budgetId: number): number | null {
    return this.transferAllocations().get(budgetId) ?? null;
  }

  setAllocation(budgetId: number, value: string): void {
    const parsed = Number(String(value).replace(/[^\d.-]/g, ''));
    this.transferAllocations.update(map => {
      const next = new Map(map);
      if (Number.isFinite(parsed) && parsed > 0) next.set(budgetId, parsed);
      else next.delete(budgetId);
      return next;
    });
  }

  transferAllocatedTotal = computed(() => {
    let total = 0;
    for (const amount of this.transferAllocations().values()) total += amount ?? 0;
    return total;
  });

  transferRemaining = computed(() => (this.transferTotal() ?? 0) - this.transferAllocatedTotal());

  canSubmitTransfer(): boolean {
    return !!this.transferTotal() && this.transferTotal()! > 0
      && this.transferAllocatedTotal() > 0
      && this.transferRemaining() === 0
      && !this.savingTransfer();
  }

  submitTransfer(): void {
    const customer = this.selectedCustomer();
    if (!customer || !this.canSubmitTransfer()) return;

    const allocations: PaymentTransferAllocation[] = [];
    for (const [budgetId, amount] of this.transferAllocations().entries()) {
      if (!amount) continue;
      allocations.push({ budgetId, amount, paymentType: 'Abono', note: this.transferNote });
    }

    const payload: CreatePaymentTransferRequest = {
      customerId: customer.customerId,
      totalAmount: this.transferTotal() as number,
      transferDate: this.transferDate,
      note: this.transferNote,
      allocations,
    };

    this.savingTransfer.set(true);
    this.paymentTransferService.create(payload).subscribe({
      next: () => {
        this.savingTransfer.set(false);
        this.closeTransferDialog();
        this.loadMovementsFor(customer.customerId);
        this.notifySuccess('Transferencia registrada', `$ ${this.money(payload.totalAmount)} repartidos en ${allocations.length} factura(s)`);
      },
      error: () => {
        this.savingTransfer.set(false);
        this.notifyError('No se pudo registrar la transferencia. Verifica que el reparto cuadre con el total.');
      },
    });
  }

  showTransferDetail(transferId: number): void {
    // La pastilla ya resolvió esta transferencia para mostrar su valor y fecha:
    // el diálogo reutiliza esa copia en vez de repetir la petición.
    const cached = this.transfersById().get(transferId);
    if (cached) {
      this.transferDetail.set(cached);
      this.transferDetailVisible.set(true);
      return;
    }

    this.paymentTransferService.getById(transferId).subscribe({
      next: (detail: any) => {
        this.transferDetail.set(detail ?? null);
        this.transferDetailVisible.set(true);
        if (detail) this.transfersById.update(map => new Map(map).set(transferId, detail));
      },
      error: () => this.notifyError('No se pudo cargar el detalle de la transferencia.'),
    });
  }

  // -------------------------------------------------------------- avisos

  private notifySuccess(summary: string, detail: string): void {
    this.messageService.add({ key: 'ac-inline', severity: 'success', summary, detail, life: 2400 });
  }

  private notifyError(detail: string): void {
    this.messageService.add({ key: 'ac-inline', severity: 'error', summary: 'No se guardó', detail, life: 3600 });
  }

  // ----------------------------------------------------------------- PDF

  async generarPDF(): Promise<void> {
    const rows = this.filteredBudgets();
    if (!rows.length) {
      this.notifyError('Este cliente no tiene cotizaciones facturadas para imprimir.');
      return;
    }

    this.spinner.show();
    try {
      const cliente = this.selectedCustomer();
      const doc = await buildAccountStatementPdf({
        budgets: rows,
        movements: this.movementsByBudget(),
        customer: cliente,
        company: this.companyInfo(),
      });
      doc.save(accountStatementFileName(cliente));
    } catch (error) {
      console.error('Error al generar PDF:', error);
      this.notifyError('No se pudo generar el PDF.');
    } finally {
      this.spinner.hide();
    }
  }
}
