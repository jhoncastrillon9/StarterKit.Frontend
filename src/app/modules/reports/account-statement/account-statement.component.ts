import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { BudgetService } from '../../budgets/services/budget.service';
import { CustomerService } from '../../customers/services/customer.service';
import { CompanyService } from '../../configurations/services/company.service';
import { PaymentService } from '../../payments/services/payment.service';
import { PaymentTransferService } from '../../payments/services/payment-transfer.service';
import { PaymentModel, CreatePaymentTransferRequest, PaymentTransferAllocation } from '../../payments/models/payment.Model';
import { BudgetModel } from '../../budgets/models/budget.Model';
import { CustomerModel } from '../../customers/models/customer.Model';
import { NgxSpinnerService } from 'ngx-spinner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BUDGET_ESTADOS } from '../../../shared/constants';
import { DataTableColumn } from '../../../shared/ui/data-table/data-table.types';

/** Tipo de movimiento que descuenta saldo de una cotización facturada. */
export type MovementKind = 'Abono' | 'Ajuste';

/** Borrador del formulario de "registrar movimiento" de una fila. */
interface MovementDraft {
  kind: MovementKind;
  amount: number | null;
  note: string;
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

  /** Solo las cotizaciones en este estado se cobran en el estado de cuenta. */
  private static readonly BILLED_STATUS = 'facturada';

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
  transferTotal: number | null = null;
  transferDate: Date = new Date();
  transferNote = '';
  transferAllocations = signal<Map<number, number | null>>(new Map());
  savingTransfer = signal(false);

  /** Borradores del formulario de movimiento, uno por cotización. */
  private drafts = new Map<number, MovementDraft>();

  tableColumns: DataTableColumn[] = [
    { field: 'internalCode', header: 'Código', width: '96px' },
    { field: 'date', header: 'Fecha', width: '118px' },
    { field: 'budgetName', header: 'Obra' },
    { field: 'externalInvoice', header: 'Factura', width: '132px' },
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
      });
  }

  loadCompanyInfo(): void {
    this.companyService.getCompanyByUser().subscribe({
      next: (res: any) => this.companyInfo.set(res),
      error: () => { /* el PDF avisa si falta la empresa */ },
    });
  }

  private indexMovements(payments: PaymentModel[]): Map<number, PaymentModel[]> {
    const map = new Map<number, PaymentModel[]>();
    for (const payment of payments) {
      if (!payment?.budgetId) continue;
      const list = map.get(payment.budgetId) ?? [];
      list.push(payment);
      map.set(payment.budgetId, list);
    }
    return map;
  }

  // -------------------------------------------------------------- cálculo

  /**
   * Solo cotizaciones del cliente en estado Facturada: son las únicas que
   * generan cobro. Antes se incluían Aprobada/En Desarrollo/Pagada, lo que
   * inflaba el total adeudado.
   */
  filteredBudgets = computed(() => {
    const customer = this.selectedCustomer();
    if (!customer) return [];
    return this.budgets()
      .filter(b =>
        b.customerId === customer.customerId &&
        (b.estado ?? '').trim().toLowerCase() === AccountStatementComponent.BILLED_STATUS
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  movementsFor(budgetId: number): PaymentModel[] {
    return this.movementsByBudget().get(budgetId) ?? [];
  }

  /** Un movimiento es ajuste si su tipo menciona ajuste/retención/impuesto. */
  kindOf(movement: PaymentModel): MovementKind {
    return /ajust|retenc|impuest/i.test(movement.paymentType ?? '') ? 'Ajuste' : 'Abono';
  }

  abonosFor(budgetId: number): number {
    return this.sum(this.movementsFor(budgetId).filter(m => this.kindOf(m) === 'Abono'));
  }

  ajustesFor(budgetId: number): number {
    return this.sum(this.movementsFor(budgetId).filter(m => this.kindOf(m) === 'Ajuste'));
  }

  /** Lo aplicado a la factura: abonos reales + ajustes (impuestos retenidos). */
  appliedFor(budgetId: number): number {
    return this.abonosFor(budgetId) + this.ajustesFor(budgetId);
  }

  saldoFor(budget: BudgetModel): number {
    return (budget.total ?? 0) - this.appliedFor(budget.budgetId);
  }

  /** Porcentaje cubierto de la factura, para la barra de progreso. */
  progressFor(budget: BudgetModel): number {
    const total = budget.total ?? 0;
    if (total <= 0) return 0;
    return Math.max(0, Math.min(100, (this.appliedFor(budget.budgetId) / total) * 100));
  }

  isSettled(budget: BudgetModel): boolean {
    return this.saldoFor(budget) <= 0.5;
  }

  private sum(movements: PaymentModel[]): number {
    return movements.reduce((acc, m) => acc + (Number(m.amountPaid) || 0), 0);
  }

  totalFacturado = computed(() =>
    this.filteredBudgets().reduce((acc, b) => acc + (b.total ?? 0), 0)
  );

  totalAbonos = computed(() =>
    this.filteredBudgets().reduce((acc, b) => acc + this.abonosFor(b.budgetId), 0)
  );

  totalAjustes = computed(() =>
    this.filteredBudgets().reduce((acc, b) => acc + this.ajustesFor(b.budgetId), 0)
  );

  /** Total adeudado real: facturado menos abonos y ajustes. */
  totalSaldo = computed(() =>
    this.totalFacturado() - this.totalAbonos() - this.totalAjustes()
  );

  settledCount = computed(() => this.filteredBudgets().filter(b => this.isSettled(b)).length);

  money(value: number): string {
    return (value ?? 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  // ------------------------------------------------------------- clientes

  onCustomerChange(customerId: string): void {
    if (!customerId) {
      this.selectedCustomer.set(null);
      this.movementsByBudget.set(new Map());
      return;
    }
    const customer = this.customers().find(c => c.customerId === +customerId) ?? null;
    this.selectedCustomer.set(customer);
    this.movementsByBudget.set(new Map());
    if (customer) this.loadMovementsFor(customer.customerId);
  }

  onCustomerSelectChange(event: Event): void {
    this.onCustomerChange((event.target as HTMLSelectElement).value);
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
      draft = { kind: 'Abono', amount: null, note: '' };
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
        this.drafts.set(budget.budgetId, { kind: draft.kind, amount: null, note: '' });
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

  canSaveEditingMovement(): boolean {
    return !!this.editingMovementDraft?.amount && this.editingMovementDraft.amount > 0;
  }

  saveMovement(budget: BudgetModel, movement: PaymentModel): void {
    const draft = this.editingMovementDraft;
    if (!draft || !this.canSaveEditingMovement()) return;

    const payload = {
      ...movement,
      paymentType: draft.kind,
      amountPaid: draft.amount as number,
      note: draft.note ?? '',
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
    this.transferTotal = null;
    this.transferDate = new Date();
    this.transferNote = '';
    this.transferAllocations.set(new Map());
    this.transferDialogVisible.set(true);
  }

  closeTransferDialog(): void {
    this.transferDialogVisible.set(false);
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

  transferRemaining = computed(() => (this.transferTotal ?? 0) - this.transferAllocatedTotal());

  canSubmitTransfer(): boolean {
    return !!this.transferTotal && this.transferTotal > 0
      && this.transferAllocatedTotal() > 0
      && Math.abs(this.transferRemaining()) < 0.5
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
      totalAmount: this.transferTotal as number,
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
      const empresa = this.companyInfo();

      const doc = new jsPDF();
      const marginX = 14;

      if (empresa?.urlImageLogo) {
        try {
          doc.addImage(await this.getBase64ImageFromURL(empresa.urlImageLogo), 'PNG', marginX, 12, 34, 17);
        } catch {
          // Sin logo: el encabezado de texto es suficiente.
        }
      }

      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(empresa?.companyName || 'Estado de cuenta', 52, 18);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(empresa?.address || '', 52, 24);
      doc.text([empresa?.telephones, empresa?.email].filter(Boolean).join('  ·  '), 52, 29);

      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.text('Estado de cuenta', marginX, 44);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Cliente: ${cliente?.customerName ?? ''}`, marginX, 52);
      if (cliente?.email) doc.text(`Email: ${cliente.email}`, marginX, 57);
      if (cliente?.address) doc.text(`Dirección: ${cliente.address}`, marginX, 62);
      doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-CO')}`, marginX, 67);
      doc.setFontSize(9);
      doc.text('Incluye únicamente cotizaciones facturadas.', marginX, 72);

      const body = rows.map(b => [
        String(b.internalCode),
        b.externalInvoice && b.externalInvoice !== '0' ? b.externalInvoice : '—',
        new Date(b.date).toLocaleDateString('es-CO'),
        b.budgetName,
        `$ ${this.money(b.total ?? 0)}`,
        `$ ${this.money(this.abonosFor(b.budgetId))}`,
        `$ ${this.money(this.ajustesFor(b.budgetId))}`,
        `$ ${this.money(this.saldoFor(b))}`,
      ]);

      autoTable(doc, {
        head: [['Código', 'Factura', 'Fecha', 'Obra', 'Facturado', 'Abonos', 'Ajustes', 'Saldo']],
        body,
        foot: [[
          { content: 'Totales', colSpan: 4 },
          `$ ${this.money(this.totalFacturado())}`,
          `$ ${this.money(this.totalAbonos())}`,
          `$ ${this.money(this.totalAjustes())}`,
          `$ ${this.money(this.totalSaldo())}`,
        ]],
        startY: 78,
        theme: 'grid',
        headStyles: { fillColor: [109, 40, 217], textColor: 255, fontStyle: 'bold' },
        footStyles: { fillColor: [243, 240, 252], textColor: 20, fontStyle: 'bold' },
        styles: { fontSize: 8.5, cellPadding: 2.4 },
        columnStyles: {
          4: { halign: 'right' }, 5: { halign: 'right' },
          6: { halign: 'right' }, 7: { halign: 'right' },
        },
      });

      const endY = (doc as any).lastAutoTable?.finalY ?? 78;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Saldo pendiente: $ ${this.money(this.totalSaldo())}`, marginX, endY + 12);

      const nombre = (cliente?.customerName ?? 'cliente').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
      doc.save(`estado-cuenta-${nombre}.pdf`);
    } catch (error) {
      console.error('Error al generar PDF:', error);
      this.notifyError('No se pudo generar el PDF.');
    } finally {
      this.spinner.hide();
    }
  }

  private getBase64ImageFromURL(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.setAttribute('crossOrigin', 'anonymous');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext('2d')?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = url;
    });
  }
}
