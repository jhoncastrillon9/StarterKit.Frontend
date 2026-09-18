import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { BudgetHistoryModel, BudgetHistoryFilterRequest } from '../models/budget-history.model';
import { BudgetHistoryService } from '../services/budget-history.service';
import { IconSetService } from '@coreui/icons-angular';
import { Router } from '@angular/router';
import { cilReload, cilZoom, cilHistory } from '@coreui/icons';
import { NgxSpinnerService } from 'ngx-spinner';
import { ViewEncapsulation } from '@angular/core';
import { ConfirmationModalComponent } from 'src/app/shared/components/reusable-modal/reusable-modal.component';
import { Subscription } from 'rxjs';
import { DataTableComponent } from 'src/app/shared/ui/data-table/data-table.component';
import { DataTableColumn, DataTableFilterValue, DataTableLazyEvent, KpiDef } from 'src/app/shared/ui/data-table/data-table.types';

@Component({
  selector: 'app-list-budget-history',
  templateUrl: './list-budget-history.component.html',
  styleUrls: ['./list-budget-history.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ListBudgetHistoryComponent implements OnInit, OnDestroy {
  @ViewChild('confirmationModal') confirmationModal!: ConfirmationModalComponent;
  @ViewChild('dt') dataTable!: DataTableComponent;

  // Mismas capacidades que el listado de cotizaciones: orden, filtro por columna
  // y busqueda global. Al ser lazy, los filtros viajan al backend en el evento.
  tableColumns: DataTableColumn[] = [
    { field: 'internalCode', header: 'Codigo', align: 'center', sortable: true, filter: { type: 'text', placeholder: 'Codigo' } },
    { field: 'fecha', header: 'Fecha', sortable: true, filter: { type: 'dateRange' } },
    { field: 'budgetName', header: 'Obra', sortable: true, filter: { type: 'text', placeholder: 'Obra' } },
    { field: 'estado', header: 'Estado', sortable: true, filter: { type: 'select', options: [] } },
    { field: 'logCambio', header: 'Log de Cambio', sortable: true, filter: { type: 'text', placeholder: 'Cambio' } },
    { field: 'acciones', header: 'Acciones', align: 'right' },
  ];

  get kpis(): KpiDef[] {
    return [{ key: 'total', label: 'Registros', value: this.totalRecords, dotColor: '#6d28d9' }];
  }

  /**
   * Opciones del filtro de Estado. Salen de la pagina cargada, igual que en el
   * listado de cotizaciones; se acumulan para no perder las ya vistas al paginar.
   */
  private estadosVistos = new Set<string>();

  private refreshEstadoFilterOptions(): void {
    for (const h of this.historyItems) {
      if (h.estado) this.estadosVistos.add(h.estado);
    }
    const options = [...this.estadosVistos].sort().map(e => ({ label: e, value: e }));
    this.tableColumns = this.tableColumns.map(col =>
      col.field === 'estado' ? { ...col, filter: { ...col.filter!, options } } : col);
  }

  onSearchChange(value: string): void {
    this.filterRequest.search = value || '';
    if (this.dataTable) { this.dataTable.resetToFirstPage(); } else { this.loadHistory(); }
  }

  /** Traduce los filtros por columna de la tabla a la peticion del backend. */
  private applyColumnFilters(filters?: Record<string, DataTableFilterValue>): void {
    const f = filters ?? {};

    const code = f['internalCode']?.value;
    const parsedCode = typeof code === 'string' ? parseInt(code, 10) : (typeof code === 'number' ? code : NaN);
    this.filterRequest.internalCode = Number.isFinite(parsedCode) ? parsedCode : null;

    this.filterRequest.budgetName = typeof f['budgetName']?.value === 'string' ? f['budgetName'].value as string : '';
    this.filterRequest.logCambio = typeof f['logCambio']?.value === 'string' ? f['logCambio'].value as string : '';

    const estados = f['estado']?.value;
    this.filterRequest.estados = Array.isArray(estados) ? estados.map(String) : [];

    // El rango de fechas llega como [desde, hasta]; cualquiera de los dos puede faltar.
    const range = f['fecha']?.value;
    const [from, to] = Array.isArray(range) ? range : [null, null];
    this.filterRequest.fromDate = from ? new Date(from as any) : null;
    this.filterRequest.toDate = to ? new Date(to as any) : null;
  }

  private readonly successRestoreMessage: string = "¡El presupuesto ha sido restaurado correctamente!";
  private readonly successRestoreTitle: string = "¡Restauración Completada!";
  private readonly errorGeneralMessage: string = "Algo salió mal. Por favor, intenta de nuevo más tarde. Si el problema persiste, no dudes en contactar con el soporte técnico o intenta refrescar la página";
  private readonly errorTitle: string = "¡Ups! ocurrió un error.";
  private readonly loadDataError: string = "Algo falló al obtener el historial. Refresca la página.";
  private readonly restoreMessage: string = "¿Estás seguro de que quieres restaurar este presupuesto? Se creará un nuevo presupuesto con los datos del historial seleccionado.";
  private readonly restoreTitleConfirmation: string = "¿Restaurar presupuesto desde historial?";

  title: string = this.successRestoreTitle;
  messageModal: string = this.successRestoreMessage;

  searchValue: string | undefined;
  loading: boolean = true;
  historyItems: BudgetHistoryModel[] = [];
  totalRecords: number = 0;
  
  // Filtros
  filterRequest: BudgetHistoryFilterRequest = new BudgetHistoryFilterRequest();

  isModalError: boolean = false;
  public visible = false;
  public historyToRestore: BudgetHistoryModel | null = null;
  private confirmSubscription?: Subscription;

  constructor(
    private budgetHistoryService: BudgetHistoryService,
    public iconSet: IconSetService,
    private router: Router,
    private spinner: NgxSpinnerService
  ) {
    iconSet.icons = { cilReload, cilZoom, cilHistory };
  }

  ngOnInit() {
    this.loadHistory();
  }

  ngOnDestroy() {
    if (this.confirmSubscription) {
      this.confirmSubscription.unsubscribe();
    }
  }

  clear() {
    this.searchValue = '';
    this.filterRequest = new BudgetHistoryFilterRequest();
    if (this.dataTable) { this.dataTable.resetToFirstPage(); } else { this.loadHistory(); }
  }

  loadHistory(event?: DataTableLazyEvent) {
    this.spinner.show();
    this.loading = true;

    if (event) {
      this.filterRequest.page = Math.floor(event.first / event.rows) + 1;
      this.filterRequest.pageSize = event.rows;
      this.filterRequest.sortField = event.sortField || 'fecha';
      this.filterRequest.sortOrder = event.sortOrder ?? -1;
      this.applyColumnFilters(event.filters);
    }

    this.budgetHistoryService.getHistory(this.filterRequest).subscribe(
      response => {
        this.historyItems = response.items;
        this.totalRecords = response.total;
        this.refreshEstadoFilterOptions();
        this.spinner.hide();
        this.loading = false;
      },
      (error) => {
        this.spinner.hide();
        this.loading = false;
        this.handleError('Error to Load History', this.errorGeneralMessage);
      }
    );
  }

  restoreBudgetWithConfirm(history: BudgetHistoryModel) {
    this.historyToRestore = history;
    
    // Limpiar suscripción anterior si existe
    if (this.confirmSubscription) {
      this.confirmSubscription.unsubscribe();
    }
    
    this.confirmationModal.messageModal = this.restoreMessage;
    this.confirmationModal.title = this.restoreTitleConfirmation;
    this.confirmationModal.isConfirmation = true;
    this.confirmationModal.titleButtonComfimationYes = 'Si, restaurar';

    // Crear nueva suscripción
    this.confirmSubscription = this.confirmationModal.confirmAction.subscribe(() => this.restoreBudget());

    this.confirmationModal.openModal();
  }

  restoreBudget() {
    // Se captura y se anula el objetivo de forma SINCRONA, antes del setTimeout y de la
    // llamada HTTP (mismo patron que list-budget, listcustomer y list-project-report).
    // Antes solo se anulaba en el callback HTTP, y como el boton de confirmar del modal
    // sigue clicable durante el fade-out del c-modal, dos clics lanzaban dos
    // restauraciones del mismo snapshot: entradas de historial duplicadas y dos modales.
    const history = this.historyToRestore;
    this.historyToRestore = null;
    if (!history) return;

    // Pequeño delay para asegurar que el modal de confirmación se cierre completamente
    setTimeout(() => {
      this.spinner.show();
      this.budgetHistoryService.restoreFromHistory(history.budgetHistoryId).subscribe(
        (response) => {
          this.spinner.hide();
          this.showModal(false, this.successRestoreMessage, this.successRestoreTitle);
          this.loadHistory();
        },
        (error) => {
          this.spinner.hide();
          this.handleError('Error to Restore Budget', 'No se pudo restaurar el presupuesto. Inténtalo de nuevo.');
        }
      );
    }, 300);
  }

  viewBudget(history: BudgetHistoryModel) {
    this.spinner.show();
    this.loading = true;
    this.budgetHistoryService.downloadPdfFromHistory(history.budgetHistoryId).subscribe(
      (data: Blob) => {
        const url = window.URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Historial_' + history.internalCode + '_' + history.budgetName + '.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.spinner.hide();
        this.loading = false;
      },
      (error) => {
        this.spinner.hide();
        this.loading = false;
        this.handleError('Error to download PDF from history', 'No se pudo descargar el PDF del historial. Inténtalo de nuevo.');
      }
    );
  }

  private handleError(logMessage: string, userMessage: string): void {
    console.error(logMessage);
    this.showModal(true, userMessage, this.errorTitle);
  }

  private showModal(isError: boolean, message: string, title: string): void {
    this.isModalError = isError;
    this.messageModal = message;
    this.title = title;
    this.confirmationModal.messageModal = message;
    this.confirmationModal.title = title;
    this.confirmationModal.isConfirmation = false;
    this.confirmationModal.isModalError = isError;
    this.confirmationModal.openModal();
  }

  toggleLiveDemo() {
    this.visible = !this.visible;
  }

  handleLiveDemoChange(event: any) {
    this.visible = event;
  }
}
