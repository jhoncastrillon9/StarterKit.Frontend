import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { BudgetModel } from '../models/budget.Model';
import { SendBudgetPdfRequest } from '../models/sendBudgetRequest';
import { BudgetService } from '../services/budget.service';
import { IconSetService } from '@coreui/icons-angular';
import { ActivatedRoute, Router } from '@angular/router';
import { cilPencil, cilXCircle, cilZoom, cilCloudDownload, cilNoteAdd, cilMoney, cilCopy, cilContact, cibMailchimp, cibMailRu, cibMinutemailer, cilMicrophone } from '@coreui/icons';
import { NgxSpinnerService } from 'ngx-spinner';
import { MessageService } from 'primeng/api';
import { convertBlobToWavPcm16kMono } from 'src/app/shared/audio-utils';
import { Table, TableModule } from 'primeng/table';
import { ConfirmationModalComponent } from 'src/app/shared/components/reusable-modal/reusable-modal.component';
import { EmailSelectorModalComponent } from 'src/app/shared/components/email-selector-modal/email-selector-modal.component';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { MenuItem } from 'primeng/api';
import { Menu } from 'primeng/menu';
import { OverlayPanel } from 'primeng/overlaypanel';
import { DataTableColumn } from 'src/app/shared/ui/data-table/data-table.types';
import { ChipOption } from 'src/app/shared/ui/filter-chips/filter-chips.component';
import { InvoiceService } from 'src/app/modules/invoices/services/invoice.service';
import { InvoiceModel, INVOICE_STATUS } from 'src/app/modules/invoices/models/invoice.Model';
import { extractApiErrorMessage } from 'src/app/shared/api-error';



@Component({
  selector: 'app-list-budget',
  templateUrl: './list-budget.component.html',
  styleUrls: ['./list-budget.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ListBudgetComponent implements OnInit {
  @ViewChild('confirmationModal') confirmationModal!: ConfirmationModalComponent;
  @ViewChild('emailSelectorModal') emailSelectorModal!: EmailSelectorModalComponent;
  @ViewChild('menu') menu!: Menu;
  @ViewChild('statusMenu') statusMenu!: Menu;
  @ViewChild('estadoPanel') estadoPanel!: OverlayPanel;
  @ViewChild('accionesPanel') accionesPanel!: OverlayPanel;
  isModalError: boolean = false;
  private readonly successDeleteMessage: string = "¡La cotización ha sido eliminada correctamente!";
  private readonly successSendBusgetMessage: string = "¡Todo listo! Tu correo ha volado hacia sus destinatarios. Si no lo ves pronto, échale un ojo a la carpeta de spam... 😉";
  private readonly successSendBusgetTitle: string = "¡Correo Enviado!";


  private readonly errorGeneralMessage: string = "Algo salió mal. Por favor, intenta de nuevo más tarde. Si el problema persiste, no dudes en contactar con el soporte técnico o intenta refrescar la pagina";
  private readonly errorToSendEmailMessage: string = "Algo salió mal al enviar el email. Por favor, intenta de nuevo más tarde. Si el problema persiste, no dudes en contactar con el soporte técnico o intenta refrescar la pagina";
  private readonly errorTocopyBudgetMessage: string = "Algo salió mal al copiar la cotización. Por favor, intenta de nuevo más tarde. Si el problema persiste, no dudes en contactar con el soporte técnico o intenta refrescar la pagina";
  private readonly errorToDownloadBudgetMessage: string = "Algo salió mal al descargar la cotización. Por favor, intenta de nuevo más tarde. Si el problema persiste, no dudes en contactar con el soporte técnico o intenta refrescar la pagina";

  private readonly successDeleteTitle: string = "¡Eliminación Completada!";
  private readonly errorDeleteMessage: string = "Hubo un problema al intentar eliminar la cotización. Si tienes docuemntos asociados no podemos la podemos eliminar";
  private readonly errorTitle: string = "¡Ups! ocurrió un error.";
  private readonly loadDataError: string = "Algo falló al obtener las cotizaciones. Refresca la página.";
  private readonly deleteMessage: string = "Una vez eliminado, no hay vuelta atrás... bueno, tal vez sí, pero mejor asegúrate antes de despedirlo para siempre. 😅";
  private readonly deleteTitleComfirmation: string = "¿Quieres eliminar esta cotización?";
  private readonly sendEmailTitleComfirmation: string = "¡Cotización en camino! 📬";
  /** Texto por defecto del modal de emails (el mismo que trae EmailSelectorModalComponent). */
  private readonly selectEmailsMessage: string = "Selecciona los correos a los que deseas enviar:";

  title: string = this.successDeleteTitle;
  messageModal: string = this.successDeleteMessage;

  searchValue: string | undefined;

  activeStatusFilter: string = 'Todas';

  tableColumns: DataTableColumn[] = [
    { field: 'internalCode', header: 'Codigo', sortable: true, sortField: 'budgetId', align: 'center', filter: { type: 'text', placeholder: 'Codigo' } },
    { field: 'date', header: 'Fecha', sortable: true, filter: { type: 'dateRange' } },
    { field: 'budgetName', header: 'Obra', sortable: true, filter: { type: 'text', placeholder: 'Obra' } },
    { field: 'customerDto.customerName', header: 'Cliente', sortable: true, filter: { type: 'text', placeholder: 'Cliente' } },
    { field: 'externalInvoice', header: 'Factura', sortable: true, filter: { type: 'text', placeholder: 'Factura' } },
    { field: 'estado', header: 'Estado', sortable: true, filter: { type: 'select', options: [] } },
    { field: 'total', header: 'Total', sortable: true, align: 'right', filter: { type: 'numericRange' } },
    { field: 'acciones', header: 'Acciones', align: 'right' },
  ];

  /** Las opciones del filtro de Estado salen de los datos, no de una lista fija. */
  private refreshEstadoFilterOptions(): void {
    const estados = [...new Set(this.budgets.map(b => b.estado).filter(Boolean))].sort();
    this.tableColumns = this.tableColumns.map(col =>
      col.field === 'estado'
        ? { ...col, filter: { ...col.filter!, options: estados.map(e => ({ label: e, value: e })) } }
        : col);
  }

  /** 'Todas' = all; 'Facturadas' = has external invoice; else exact estado. */
  private matchesStatus(b: BudgetModel, status: string): boolean {
    if (status === 'Todas') return true;
    if (status === 'Facturadas') return !!b.externalInvoice && b.externalInvoice !== '0' && b.externalInvoice !== '';
    return b.estado === status;
  }

  /**
   * Array estable para [value] de app-data-table. Antes era un getter que devolvía
   * un array nuevo en cada ciclo de detección de cambios: Table.ngOnChanges({value})
   * se disparaba sin parar y, con columnas con filtro declaradas, terminaba en
   * hasFilter() -> _filter() en cada tick, reseteando first a 0 y matando la
   * paginación. Se recalcula sólo cuando cambian budgets o activeStatusFilter.
   */
  filteredBudgets: BudgetModel[] = [];

  private recalcFilteredBudgets(): void {
    this.filteredBudgets = this.budgets.filter(b => this.matchesStatus(b, this.activeStatusFilter));
  }

  get chipOptions(): ChipOption[] {
    return [
      { label: 'Todas',     value: 'Todas',     count: this.budgets.length },
      { label: 'Cotizada',  value: 'Cotizada',  count: this.getCountByStatus('Cotizada') },
      { label: 'Aprobada',  value: 'Aprobada',  count: this.getCountByStatus('Aprobada') },
      { label: 'Facturada', value: 'Facturada', count: this.getCountByStatus('Facturada') },
    ];
  }

  onChipChange(value: string): void {
    this.activeStatusFilter = value;
    this.recalcFilteredBudgets();
  }

  loading: boolean = true;
  budgets: BudgetModel[] = [];
  menuItems: MenuItem[] = [];
  statusMenuItems: MenuItem[] = [];
  currentBudget: BudgetModel | null = null;

  displayScheduleDialog: boolean = false;
  scheduleParams: { weeks: number | null; startDate: Date | null; budgetId: number | null } = {
    weeks: null,
    startDate: null,
    budgetId: null
  };

  displayMergeDialog: boolean = false;
  mergeParams: { 
    budgetId1: number | null; 
    budgetId2: number | null; 
    newBudgetName: string; 
    note: string;
  } = {
    budgetId1: null,
    budgetId2: null,
    newBudgetName: '',
    note: ''
  };

  isModalWithError: boolean = false;
  isModalForDelete: boolean = false;
  isModalForSetInvoice: boolean = false;
  isModalForSendEmailBudget: boolean = false;

  public visible = false;
  public budgetToDelete: BudgetModel | null = null;
  public budgetToSendEmail: BudgetModel = new BudgetModel;
  public availableEmails: string[] = [];
  public selectedEmailsToSend: string[] = [];
  public emailSendType: 'pdf' | 'excel' | 'invoice' = 'pdf'; // Tipo de envío: PDF, Excel o Facturar

  public budgetToSetInvoice: BudgetModel | null = null;
  private originalStatuses: Map<number, string> = new Map();

  // --- Facturar / Editar y Facturar (Task 5) ---
  public budgetToInvoice: BudgetModel | null = null;

  invoiceFeedbackVisible: boolean = false;
  invoiceFeedbackSeverity: 'success' | 'warning' | 'error' = 'success';
  invoiceFeedbackTitle: string = '';
  invoiceFeedbackMessage: string = '';
  invoiceFeedbackShowResolutionLink: boolean = false;
  invoiceFeedbackShowGoToInvoices: boolean = false;

  private readonly errorFacturarMessage: string = 'No se pudo facturar la cotización. Por favor, intenta de nuevo más tarde.';
  private readonly errorEditarYFacturarMessage: string = 'No se pudo crear el borrador de factura. Por favor, intenta de nuevo más tarde.';

  // Propiedades para edición inline de factura
  editingInvoiceBudgetId: number | null = null;
  editingInvoiceValue: string = '';
  private originalInvoiceValue: string = '';

  // Feedback sutil al editar Estado / Factura (spinner inline + chulito / toast)
  savingStatusId: number | null = null;
  savedStatusId: number | null = null;
  savingInvoiceId: number | null = null;
  savedInvoiceId: number | null = null;
  private readonly savedCheckDurationMs: number = 1200;

  statusOptions: any[] = [
    { label: 'Cotizada', value: 'Cotizada' },
    { label: 'Aprobada', value: 'Aprobada' },
    { label: 'Rechazada', value: 'Rechazada' },
    { label: 'En Desarrollo', value: 'En Desarrollo' },
    { label: 'Finalizado', value: 'Finalizado' },
    { label: 'Facturada', value: 'Facturada' },
    { label: 'Pagada', value: 'Pagada' }
  ];

  // Colores del punto por estado (consistentes con el pill del diseño)
  private statusDotColors: { [k: string]: string } = {
    'Cotizada': '#f0a500', 'Aprobada': '#1aa35c', 'Facturada': '#12a0d8',
    'Rechazada': '#e5484d', 'En Desarrollo': '#ff9800', 'Finalizado': '#2e7d32', 'Pagada': '#9333ea',
  };


  // Propiedades para grabación de audio con IA
  isRecording: boolean = false;
  mediaRecorder: MediaRecorder | null = null;
  audioChunks: Blob[] = [];
  aiProcessingStatus: string = ''; // Estado del procesamiento de IA
  isProcessingAI: boolean = false; // Indica si está procesando con IA

  constructor(private budgetService: BudgetService,
    private invoiceService: InvoiceService,
    public iconSet: IconSetService,
    private router: Router,
    private route: ActivatedRoute,
    private spinner: NgxSpinnerService,
    private messageService: MessageService) {
    iconSet.icons = { cilPencil, cilXCircle, cilZoom, cilCloudDownload, cilNoteAdd, cilMoney, cilCopy, cilContact, cibMailchimp, cibMailRu, cibMinutemailer, cilMicrophone };
  }


  ngOnInit() {
    this.loadBudgets();
    
    // Verificar si debe iniciar grabación IA automáticamente
    this.route.queryParams.subscribe(params => {
      if (params['startAI'] === 'true') {
        // Esperar un poco para que el componente esté listo
        setTimeout(() => {
          this.toggleRecordingAI();
        }, 500);
      }
    });
  }

  clear(table: Table) {
    table.clear();
    this.searchValue = ''
  }


  loadBudgets() {
    this.spinner.show()
    this.loading = true;
    this.budgetService.get().subscribe(customers => {
      this.budgets = customers;
      this.budgets.forEach(b => this.originalStatuses.set(b.budgetId, b.estado));
      this.refreshEstadoFilterOptions();
      this.recalcFilteredBudgets();
      this.spinner.hide();
      this.loading = false;
    }, (error) => {
      this.spinner.hide();
      this.loading = false;
      this.handleError('Error to Load Bugets', this.errorGeneralMessage);
    });
  }

  onStatusChange(budget: BudgetModel) {
    const oldStatus = this.originalStatuses.get(budget.budgetId);
    this.savingStatusId = budget.budgetId;
    const updatedBudget = { status: budget.estado, budgetId: budget.budgetId };
    this.budgetService.updateStatus(updatedBudget).subscribe(
      (response: any) => {
        this.savingStatusId = null;
        this.originalStatuses.set(budget.budgetId, budget.estado);
        this.notifySaveSuccess(
          budget.budgetId,
          '¡Estado actualizado!',
          `Cotización ${budget.internalCode} → ${budget.estado}`,
          () => { this.savedStatusId = budget.budgetId; },
          () => { if (this.savedStatusId === budget.budgetId) { this.savedStatusId = null; } }
        );
      },
      (error) => {
        this.savingStatusId = null;
        if (oldStatus) {
          budget.estado = oldStatus;
          // Revertir también puede sacar/meter la fila del array cacheado.
          this.recalcFilteredBudgets();
        }
        this.notifySaveError('Error updating status', 'No se pudo actualizar el estado. Inténtalo de nuevo.');
      }
    );
  }

  startEditingInvoice(budget: BudgetModel) {
    this.editingInvoiceBudgetId = budget.budgetId;
    const invoiceValue = budget.externalInvoice && budget.externalInvoice !== '0' ? budget.externalInvoice : '';
    this.editingInvoiceValue = invoiceValue;
    this.originalInvoiceValue = invoiceValue;
    setTimeout(() => {
      const input = document.querySelector('input[placeholder="Factura"]') as HTMLInputElement;
      if (input) input.focus();
    }, 0);
  }

  cancelEditingInvoice() {
    this.editingInvoiceBudgetId = null;
    this.editingInvoiceValue = '';
  }

  saveExternalInvoice(budget: BudgetModel) {
    if (this.editingInvoiceValue === this.originalInvoiceValue) {
      this.cancelEditingInvoice();
      return;
    }

    const newInvoiceValue = this.editingInvoiceValue;
    this.savingInvoiceId = budget.budgetId;
    this.cancelEditingInvoice();
    const updatedData = { budgetId: budget.budgetId, externalInvoice: newInvoiceValue };

    this.budgetService.updateExternalInvoice(updatedData).subscribe(
      (response: any) => {
        this.savingInvoiceId = null;
        budget.externalInvoice = newInvoiceValue;
        // externalInvoice es el criterio del chip "Facturadas": recalcular el
        // array cacheado para que la fila aparezca/desaparezca sin recargar.
        this.recalcFilteredBudgets();
        this.notifySaveSuccess(
          budget.budgetId,
          '¡Factura actualizada!',
          `Cotización ${budget.internalCode}`,
          () => { this.savedInvoiceId = budget.budgetId; },
          () => { if (this.savedInvoiceId === budget.budgetId) { this.savedInvoiceId = null; } }
        );
      },
      (error) => {
        this.savingInvoiceId = null;
        this.notifySaveError('Error updating external invoice', 'No se pudo actualizar la factura. Inténtalo de nuevo.');
      }
    );
  }

  // Muestra feedback de éxito sutil: en PC un toast arriba-derecha; en móvil un chulito
  // verde junto al campo por unos segundos. En desktop el chulito queda oculto por CSS.
  private notifySaveSuccess(
    budgetId: number,
    title: string,
    detail: string,
    showCheck: () => void,
    clearCheck: () => void
  ) {
    if (this.isDesktop()) {
      this.messageService.add({ key: 'budget-inline', severity: 'success', summary: title, detail, life: 2500 });
    } else {
      showCheck();
      setTimeout(() => clearCheck(), this.savedCheckDurationMs);
    }
  }

  // Error sutil: toast rojo arriba-derecha (en PC y móvil). El valor ya fue revertido por el caller.
  private notifySaveError(consoleMessage: string, message: string) {
    console.error(consoleMessage);
    this.messageService.add({ key: 'budget-inline', severity: 'error', summary: '¡Ups!', detail: message, life: 4000 });
  }

  private isDesktop(): boolean {
    return typeof window !== 'undefined' && window.innerWidth >= 768;
  }

  deleteBudgetWithComfirm(budgetModel: BudgetModel) {
    this.budgetToDelete = budgetModel;
    this.confirmationModal.messageModal = this.deleteMessage;
    this.confirmationModal.title = this.deleteTitleComfirmation;
    this.confirmationModal.isConfirmation = true;
    this.confirmationModal.titleButtonComfimationYes = 'Si, eliminar';

    // La accion de confirmar se enlaza por plantilla ((confirmAction)="deleteBudget()").
    // Antes se suscribia aqui, en cada apertura: eso solo no duplicaba el borrado porque
    // ConfirmationModalComponent.closeModal() recreaba el EventEmitter y tiraba la
    // suscripcion anterior. Ese reemplazo ya no existe (dejaba muerto el boton Emitir de
    // edit-invoice), asi que suscribirse aqui acumularia suscripciones y borraria N veces.
    this.confirmationModal.openModal();
  }

  deleteBudget() {
    const budget = this.budgetToDelete;
    if (budget != null) {
      this.loading = true;
      this.spinner.show()
      this.budgetService.delete(budget.budgetId).subscribe(
        (response: any) => {
          this.loadBudgets();
          this.spinner.hide();
          this.loading = false;
        },
        (error) => {
          this.spinner.hide();
          this.loading = false;
          this.handleError('Error to delete Bugets', this.errorDeleteMessage);
        }
      );
    }
    this.budgetToDelete = null;

  }

  sendEmailBudgetWithComfirm(budgetModel: BudgetModel) {
    this.emailSendType = 'pdf'; // Establecer tipo de envío como PDF
    this.budgetToSendEmail = budgetModel;
    // Extraer emails del cliente (separados por ; o ,)
    const emailString = budgetModel.customerDto.email || '';
    this.availableEmails = emailString
      .split(/[;,]/)
      .map(e => e.trim())
      .filter(e => e.length > 0);

    if (this.availableEmails.length === 0) {
      this.showModal(true, 'El cliente no tiene correos electrónicos configurados.', 'Sin correos');
      return;
    }

    // Abrir el modal de selección de emails
    // emailSelectorModal es una instancia unica compartida por los tres flujos: si este
    // metodo no fija su propio message, se queda el que dejo el anterior (el aviso de
    // facturacion de facturarWithConfirm, con otro cliente y otro total).
    this.emailSelectorModal.emails = this.availableEmails;
    this.emailSelectorModal.title = this.sendEmailTitleComfirmation;
    this.emailSelectorModal.message = this.selectEmailsMessage;
    this.emailSelectorModal.confirmButtonText = 'Enviar Cotización';
    this.emailSelectorModal.openModal();
  }

  sendEmailBudgetExcelWithConfirm(budgetModel: BudgetModel) {
    this.emailSendType = 'excel'; // Establecer tipo de envío como Excel
    this.budgetToSendEmail = budgetModel;
    // Extraer emails del cliente (separados por ; o ,)
    const emailString = budgetModel.customerDto.email || '';
    this.availableEmails = emailString
      .split(/[;,]/)
      .map(e => e.trim())
      .filter(e => e.length > 0);

    if (this.availableEmails.length === 0) {
      this.showModal(true, 'El cliente no tiene correos electrónicos configurados.', 'Sin correos');
      return;
    }

    // Abrir el modal de selección de emails
    // Ver la nota de sendEmailBudgetWithComfirm: el modal es compartido y hay que
    // dejar siempre message en el valor propio de este flujo.
    this.emailSelectorModal.emails = this.availableEmails;
    this.emailSelectorModal.title = '¡Excel en camino! 📊';
    this.emailSelectorModal.message = this.selectEmailsMessage;
    this.emailSelectorModal.confirmButtonText = 'Enviar Excel';
    this.emailSelectorModal.openModal();
  }

  onEmailsSelected(selectedEmails: string[]) {
    this.selectedEmailsToSend = selectedEmails;
    if (this.emailSendType === 'pdf') {
      this.sendEmailbudget();
    } else if (this.emailSendType === 'excel') {
      this.sendEmailBudgetExcel();
    } else {
      this.confirmFacturar();
    }
  }

  sendEmailbudget() {
    this.spinner.show()
    this.loading = true;
    var request = new SendBudgetPdfRequest(this.budgetToSendEmail, this.selectedEmailsToSend);
    this.budgetService.sendEmailBudget(request).subscribe(
      (response: any) => {
        this.loadBudgets();
        this.spinner.hide();
        this.loading = false;
        this.showModal(false, this.successSendBusgetMessage, this.successSendBusgetTitle,)
      },
      (error) => {
        this.spinner.hide();
        this.loading = false;
        this.handleError('Error to send Bugets', this.errorToSendEmailMessage);
      }
    );
    this.budgetToSendEmail = new BudgetModel;
    this.selectedEmailsToSend = [];
  }

  sendEmailBudgetExcel() {
    this.spinner.show()
    this.loading = true;
    var request = new SendBudgetPdfRequest(this.budgetToSendEmail, this.selectedEmailsToSend);
    this.budgetService.sendEmailBudgetExcel(request).subscribe(
      (response: any) => {
        this.loadBudgets();
        this.spinner.hide();
        this.loading = false;
        this.showModal(false, this.successSendBusgetMessage, this.successSendBusgetTitle,)
      },
      (error) => {
        this.spinner.hide();
        this.loading = false;
        this.handleError('Error to send Budget Excel', this.errorToSendEmailMessage);
      }
    );
    this.budgetToSendEmail = new BudgetModel;
    this.selectedEmailsToSend = [];
  }


  copybudget(budgetModel: BudgetModel) {
    this.spinner.show()
    this.loading = true;
    this.budgetService.copyBudget(budgetModel).subscribe(
      (response: any) => {
        this.loadBudgets();
        this.spinner.hide();
        this.loading = false;
      },
      (error) => {
        this.spinner.hide();
        this.loading = false;
        this.handleError('Error to copybudget', this.errorTocopyBudgetMessage);

      }
    );
  }


  downloadBudget(customerModel: BudgetModel) {
    this.spinner.show();
    this.loading = true;
    this.budgetService.download(customerModel.budgetId).subscribe(
      (data: Blob) => {
        this.descargarPDF(data, customerModel);
        this.spinner.hide();
        this.loading = false;
      },
      (error) => {
        this.spinner.hide();
        this.loading = false;
        this.handleError('Error to download Bugets', this.errorToDownloadBudgetMessage);
      }
    );
  }

  private descargarPDF(data: Blob, customerModel: BudgetModel) {
    const url = window.URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Cotizacion_' + customerModel.internalCode + ' ' + customerModel.budgetName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  getTotal(amount: number) {
    var aiu = (amount * 0.1);
    var iva = aiu * 0.19;
    var total = amount + iva;
    return total
  }

  getEstadoColor(estado: string): string {
    const colores: { [key: string]: string } = {
      'Cotizada': '#2196F3',        // Azul
      'Aprobada': '#66BB6A',        // Verde Claro
      'Rechazada': '#F44336',       // Rojo
      'En Desarrollo': '#FF9800',   // Naranja
      'Finalizado': '#1B5E20',      // Verde Oscuro
      'Facturada': '#4CAF50',       // Verde
      'Pagada': '#9C27B0'           // Morado
    };
    return colores[estado] || '#6c757d'; // Color por defecto (gris) si no coincide
  }

  // Métodos para las estadísticas del header
  getCountByStatus(status: string): number {
    return this.budgets.filter(b => b.estado === status).length;
  }

  getCountWithInvoice(): number {
    return this.budgets.filter(b => b.externalInvoice && b.externalInvoice !== '0' && b.externalInvoice !== '').length;
  }

  // Métodos para los badges de estado con clases CSS
  getStatusClass(estado: string): string {
    const clases: { [key: string]: string } = {
      'Cotizada': 'status-cotizada',
      'Aprobada': 'status-aprobada',
      'Rechazada': 'status-rechazada',
      'En Desarrollo': 'status-pendiente',
      'Finalizado': 'status-aprobada',
      'Facturada': 'status-facturada',
      'Pagada': 'status-aprobada'
    };
    return clases[estado] || 'status-pendiente';
  }

  getStatusIcon(estado: string): string {
    const iconos: { [key: string]: string } = {
      'Cotizada': 'fas fa-file-alt',
      'Aprobada': 'fas fa-check-circle',
      'Rechazada': 'fas fa-times-circle',
      'En Desarrollo': 'fas fa-cogs',
      'Finalizado': 'fas fa-flag-checkered',
      'Facturada': 'fas fa-file-invoice-dollar',
      'Pagada': 'fas fa-money-check-alt'
    };
    return iconos[estado] || 'fas fa-question-circle';
  }


  private handleError(consoleMessage: string, modalMessage: string) {
    console.error(consoleMessage);
    this.showModal(true, modalMessage, this.errorTitle);
  }

  showModal(isError: boolean, message: string, title: string) {
    this.confirmationModal.isModalError = isError;
    this.confirmationModal.title = title;
    this.confirmationModal.messageModal = message;
    this.confirmationModal.isConfirmation = false; // Aseguramos que no esté en modo confirmación
    this.confirmationModal.openModal();
  }
  
  showNotify() {
    console.log('show notify');
  }

  // Abre el panel custom de estado (diseño Claude) anclado al pill
  openStatusMenu(event: Event, budget: BudgetModel) {
    this.currentBudget = budget;
    this.estadoPanel.toggle(event);
  }

  getStatusDot(estado: string): string {
    return this.statusDotColors[estado] || '#9a94ad';
  }

  selectStatus(value: string) {
    const budget = this.currentBudget;
    if (budget && budget.estado !== value) {
      budget.estado = value;
      // Muta un elemento ya presente en el array cacheado filteredBudgets: si hay un
      // chip de estado activo, esta fila puede tener que aparecer/desaparecer ya.
      this.recalcFilteredBudgets();
      this.onStatusChange(budget);
    }
  }

  statusNote(): string {
    return this.currentBudget?.estado === 'Facturada'
      ? 'Al facturar se pide el número de factura.'
      : 'El cambio queda en el historial de la cotización.';
  }

  // Abre el panel custom de acciones (diseño Claude) anclado al botón ⋯
  onMenuClick(event: Event, budget: BudgetModel) {
    this.currentBudget = budget;
    this.accionesPanel.toggle(event);
  }

  // Items del menú de acciones con el estilo del diseño (icono + label + hint)
  actionMenu: Array<{ label: string; icon: string; iconClass: string; itemClass: string; hint: string; run: (b: BudgetModel) => void }> = [
    { label: 'Editar',               icon: '✎', iconClass: '',               itemClass: '',                     hint: '',       run: (b) => this.router.navigate(['/budgets/update', b.budgetId]) },
    { label: 'Duplicar',             icon: '⧉', iconClass: '',               itemClass: '',                     hint: '',       run: (b) => this.copybudget(b) },
    { label: 'Descargar PDF',        icon: 'P', iconClass: 'dc-icon-pdf',    itemClass: '',                     hint: '',       run: (b) => this.downloadBudget(b) },
    { label: 'Descargar Excel',      icon: 'X', iconClass: 'dc-icon-xls',    itemClass: '',                     hint: '',       run: (b) => this.downloadExcel(b) },
    { label: 'Descargar Cronograma', icon: '◷', iconClass: '',               itemClass: '',                     hint: '',       run: (b) => this.openScheduleDialog(b) },
    { label: 'Unir Cotizaciones',    icon: '⊕', iconClass: 'dc-icon-accent', itemClass: 'dc-menu-item--accent', hint: '',       run: (b) => this.openMergeDialog(b) },
    { label: 'Enviar PDF',           icon: '→', iconClass: '',               itemClass: '',                     hint: 'correo', run: (b) => this.sendEmailBudgetWithComfirm(b) },
    { label: 'Enviar Excel',         icon: '→', iconClass: '',               itemClass: '',                     hint: 'correo', run: (b) => this.sendEmailBudgetExcelWithConfirm(b) },
    { label: 'Facturar',             icon: '$', iconClass: 'dc-icon-accent', itemClass: 'dc-menu-item--accent', hint: 'emite y envía', run: (b) => this.facturarWithConfirm(b) },
    { label: 'Editar y Facturar',    icon: '✎$', iconClass: '',              itemClass: '',                     hint: 'borrador',      run: (b) => this.editarYFacturar(b) },
  ];

  runAction(item: { run: (b: BudgetModel) => void }, panel: OverlayPanel) {
    if (this.currentBudget) item.run(this.currentBudget);
    panel.hide();
  }

  /**
   * "Facturar": crea, emite y envía la factura en una sola llamada (issueAndSend).
   * Es irreversible (consume número de resolución + correo real al cliente), así que
   * la confirmación (mismo patrón que sendEmailBudgetWithComfirm, reutilizando
   * EmailSelectorModalComponent) debe dejar claro cliente, correo destino y total antes
   * de continuar. Una cotización puede facturarse varias veces: no se bloquea por
   * ya tener factura(s) asociadas.
   */
  facturarWithConfirm(budget: BudgetModel): void {
    this.emailSendType = 'invoice';
    this.budgetToInvoice = budget;

    const emailString = budget.customerDto?.email || '';
    this.availableEmails = emailString
      .split(/[;,]/)
      .map(e => e.trim())
      .filter(e => e.length > 0);

    if (this.availableEmails.length === 0) {
      this.showModal(true, 'El cliente no tiene correos electrónicos configurados.', 'Sin correos');
      return;
    }

    const clienteNombre = budget.customerDto?.customerName || 'el cliente';
    const totalFormateado = '$ ' + (budget.total || 0).toLocaleString('es-ES', { maximumFractionDigits: 0 });

    this.emailSelectorModal.emails = this.availableEmails;
    this.emailSelectorModal.title = 'Facturar cotización';
    this.emailSelectorModal.message = `Se emitirá la factura para ${clienteNombre} por un total de ${totalFormateado} y se enviará al correo que selecciones. `
      + 'Esta acción consume el siguiente número de la resolución DIAN y no se puede anular. Confirma el correo destino:';
    this.emailSelectorModal.confirmButtonText = 'Sí, facturar';
    this.emailSelectorModal.openModal();

    this.warnIfBudgetAlreadyInvoiced(budget, this.emailSelectorModal.message);
  }

  /**
   * Facturar varias veces la misma cotización es intencionado y no se bloquea, pero
   * conviene avisarlo: si un intento anterior fallo tras crear el borrador, puede haber
   * quedado uno huérfano y el usuario acabaria con varias facturas de la misma obra.
   *
   * El backend no expone un endpoint "facturas de esta cotizacion" (InvoiceController
   * solo tiene GET invoice, GET invoice/{id}, from-budget/{id}, issue, send,
   * issue-and-send y pdf), pero GET /api/Invoice/invoice devuelve todas las facturas de
   * la empresa con su budgetId, asi que se filtra en cliente. Es puramente informativo:
   * se lanza en paralelo al modal ya abierto y, si falla, no se interrumpe nada.
   */
  private warnIfBudgetAlreadyInvoiced(budget: BudgetModel, baseMessage: string): void {
    this.invoiceService.get().subscribe({
      next: (invoices: InvoiceModel[]) => {
        // El usuario pudo cerrar el modal o abrir otro flujo mientras llegaba la respuesta.
        if (this.budgetToInvoice?.budgetId !== budget.budgetId) { return; }

        const existing = (invoices || []).filter(i => i.budgetId === budget.budgetId);
        if (existing.length === 0) { return; }

        const drafts = existing.filter(i => i.status === INVOICE_STATUS.draft).length;
        const detalle = drafts > 0
          ? `${existing.length} factura(s), de las cuales ${drafts} sigue(n) en borrador`
          : `${existing.length} factura(s) ya emitida(s)`;

        this.emailSelectorModal.message = baseMessage
          + ` ⚠ Esta cotización ya tiene ${detalle} en el módulo de facturación. Si no querías facturarla de nuevo, cancela y revísalo primero.`;
      },
      error: () => { /* Aviso informativo: si no se puede consultar, no se bloquea la facturación. */ }
    });
  }

  /** Ejecuta issueAndSend tras confirmar cliente, correo y total en el modal de emails. */
  confirmFacturar(): void {
    const budget = this.budgetToInvoice;
    if (!budget) { return; }

    const emails = this.selectedEmailsToSend;
    this.budgetToInvoice = null;
    this.selectedEmailsToSend = [];

    this.spinner.show();
    this.loading = true;
    this.invoiceService.issueAndSend(budget.budgetId, emails).subscribe({
      next: (invoice: InvoiceModel) => {
        this.loadBudgets();
        this.spinner.hide();
        this.loading = false;
        this.showInvoiceSuccess(invoice);
      },
      error: (error) => {
        this.spinner.hide();
        this.loading = false;
        this.handleFacturarError(error);
      }
    });
  }

  /**
   * "Editar y Facturar": crea el borrador de factura a partir de la cotización y navega
   * a la pantalla de edición para que el usuario la ajuste antes de emitirla.
   */
  editarYFacturar(budget: BudgetModel): void {
    this.spinner.show();
    this.loading = true;
    this.invoiceService.createDraftFromBudget(budget.budgetId).subscribe({
      next: (invoice: InvoiceModel) => {
        this.spinner.hide();
        this.loading = false;
        this.router.navigate(['/invoices/edit', invoice.invoiceId]);
      },
      error: (error) => {
        this.spinner.hide();
        this.loading = false;
        this.handleFacturarError(error, this.errorEditarYFacturarMessage, false);
      }
    });
  }

  private showInvoiceSuccess(invoice: InvoiceModel): void {
    this.invoiceFeedbackSeverity = 'success';
    this.invoiceFeedbackTitle = '¡Factura emitida y enviada!';
    this.invoiceFeedbackMessage = `La factura ${invoice.fullNumber} fue emitida y enviada correctamente.`;
    this.invoiceFeedbackShowResolutionLink = false;
    this.invoiceFeedbackShowGoToInvoices = true;
    this.invoiceFeedbackVisible = true;
  }

  /**
   * Regla estructural (no de texto) según cómo responde el backend
   * (InvoiceController.IssueAndSend + StarterKitMiddleware):
   *
   * - 400: el middleware traduce una BadHttpRequestException de negocio a
   *   { error: 'mensaje en español' }. OJO: un 400 NO garantiza que no se haya creado
   *   nada. Solo la validación de correos ocurre antes de tocar la base de datos; los
   *   BadHttpRequestException de IssueAsync (sin resolución, resolución no vigente,
   *   rango agotado) se lanzan DESPUÉS de crear el borrador, así que — mientras el
   *   backend no envuelva creación y emisión en una sola transacción — puede quedar un
   *   borrador huérfano de esa cotización y cada reintento sumaría otro. El mensaje del
   *   backend se muestra tal cual y se le añade el aviso de revisar el listado.
   * - Cualquier otra cosa (500 u otro fallo): el middleware devuelve un mensaje
   *   técnico crudo de .NET en { error: '...' } — no apto para el usuario — y en
   *   este endpoint solo puede llegar desde SendInvoiceEmailAsync, es decir, DESPUÉS
   *   de crear y emitir la factura. Nunca se muestra ese texto crudo; se le dice al
   *   usuario que la factura pudo quedar creada y que lo confirme en el listado.
   *
   * isIssueFlow distingue las dos acciones: "Facturar" (emite y envía) y
   * "Editar y Facturar" (solo crea un borrador). En la segunda no hay emisión ni
   * correo, asi que hablarle al usuario de reenviar la factura no tendria sentido.
   */
  private handleFacturarError(
    error: any,
    fallbackMessage: string = this.errorFacturarMessage,
    isIssueFlow: boolean = true
  ): void {
    console.error('Error al facturar la cotización', error);
    const isBusinessValidationError = error?.status === 400;
    // Entiende tanto { error: mensaje } como ValidationProblemDetails (ver shared/api-error.ts).
    const backendMessage = extractApiErrorMessage(error);

    if (isBusinessValidationError) {
      const message = backendMessage || fallbackMessage;
      this.invoiceFeedbackSeverity = 'error';
      this.invoiceFeedbackTitle = isIssueFlow ? 'No se pudo facturar' : 'No se pudo crear la factura';
      // El borrador puede haberse creado antes de que fallara la emisión: avisar de que
      // lo revise en el listado de facturas evita acabar con varios borradores huérfanos
      // de la misma cotización tras un par de reintentos.
      this.invoiceFeedbackMessage = isIssueFlow
        ? message + ' Puede que haya quedado un borrador de esta factura en el listado de facturas: revísalo antes de reintentar para no acabar con varios.'
        : message;
      this.invoiceFeedbackShowResolutionLink = this.isResolutionNotConfiguredError(message);
      this.invoiceFeedbackShowGoToInvoices = isIssueFlow;
      this.invoiceFeedbackVisible = true;
      return;
    }

    // No es un 400 de negocio: la factura pudo haber quedado creada/emitida antes
    // de que fallara el envío del correo. No se muestra backendMessage (es texto
    // técnico de .NET en inglés cuando viene de un 500); se deja solo en consola.
    this.invoiceFeedbackSeverity = 'warning';
    this.invoiceFeedbackTitle = 'Verifica el estado de la factura';
    this.invoiceFeedbackMessage = isIssueFlow
      ? 'No se pudo confirmar el envío, pero la factura pudo haber quedado creada. '
        + 'Revisa el listado de facturas: si ya existe, puedes reenviarla desde ahí.'
      : 'No se pudo confirmar el resultado, pero el borrador de la factura pudo haber quedado creado. '
        + 'Revisa el listado de facturas antes de intentarlo de nuevo para no crear dos.';
    this.invoiceFeedbackShowResolutionLink = false;
    this.invoiceFeedbackShowGoToInvoices = true;
    this.invoiceFeedbackVisible = true;

    // Puede que la factura ya exista en el backend: refrescamos por si acaso.
    this.loadBudgets();
  }

  private isResolutionNotConfiguredError(message: string): boolean {
    const normalized = message.toLowerCase();
    if (!normalized.includes('resoluci')) { return false; }
    return normalized.includes('no hay') || normalized.includes('no existe') || normalized.includes('no esta configurada')
      || normalized.includes('no está configurada') || normalized.includes('no esta configurado') || normalized.includes('no está configurado')
      || normalized.includes('sin configurar') || normalized.includes('configura');
  }

  goToInvoicesModule(): void {
    this.invoiceFeedbackVisible = false;
    this.router.navigate(['/invoices/invoices']);
  }

  goToResolutionConfigFromInvoice(): void {
    this.invoiceFeedbackVisible = false;
    this.router.navigate(['/invoices/resolution']);
  }

  closeInvoiceFeedback(): void {
    this.invoiceFeedbackVisible = false;
  }

  getMenuItems(budget: BudgetModel): MenuItem[] {
    return [
      {
        label: 'Descargar PDF',
        icon: 'pi pi-file-pdf',
        command: () => this.downloadBudget(budget)
      },
      {
        label: 'Descargar Excel',
        icon: 'pi pi-file-excel',
        command: () => this.downloadExcel(budget)
      },
      {
        label: 'Descargar Cronograma',
        icon: 'pi pi-calendar',
        command: () => this.openScheduleDialog(budget)
      },
      {
        separator: true
      },
      {
        label: 'Editar',
        icon: 'pi pi-pencil',
        command: () => this.router.navigate(['/budgets/update', budget.budgetId])
      },
      {
        label: 'Duplicar',
        icon: 'pi pi-copy',
        command: () => this.copybudget(budget)
      },
      {
        label: 'Unir Cotizaciones',
        icon: 'pi pi-plus-circle',
        command: () => this.openMergeDialog(budget)
      },
      {
        label: 'Enviar PDF',
        icon: 'pi pi-send',
        command: () => this.sendEmailBudgetWithComfirm(budget)
      },
      {
        label: 'Enviar Excel',
        icon: 'pi pi-file-excel',
        command: () => this.sendEmailBudgetExcelWithConfirm(budget)
      },
      {
        separator: true
      },
      {
        label: 'Eliminar',
        icon: 'pi pi-trash',
        command: () => this.deleteBudgetWithComfirm(budget),
        styleClass: 'text-danger'
      }
    ];
  }

  downloadExcel(budget: BudgetModel) {
    this.spinner.show();
    this.loading = true;
    this.budgetService.downloadExcel(budget.budgetId).subscribe(
      (data: Blob) => {
        const url = window.URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Cotizacion_' + budget.internalCode + '_' + budget.budgetName + '.xlsx';
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
        this.handleError('Error al descargar Excel', 'No se pudo descargar el archivo Excel. Por favor, intenta de nuevo.');
      }
    );
  }

  openScheduleDialog(budget: BudgetModel) {
    this.scheduleParams = {
      weeks: 4,
      startDate: new Date(),
      budgetId: budget.budgetId
    };
    this.displayScheduleDialog = true;
  }

  downloadSchedule() {
    if (!this.scheduleParams.weeks || !this.scheduleParams.startDate || !this.scheduleParams.budgetId) {
      return;
    }

    this.displayScheduleDialog = false;
    this.spinner.show();
    this.loading = true;

    const budget = this.budgets.find(b => b.budgetId === this.scheduleParams.budgetId);
    const formattedDate = this.formatDate(this.scheduleParams.startDate);

    this.budgetService.downloadSchedule(
      this.scheduleParams.budgetId,
      this.scheduleParams.weeks,
      formattedDate
    ).subscribe(
      (data: Blob) => {
        const url = window.URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Cronograma_' + (budget?.internalCode || this.scheduleParams.budgetId) + '.xlsx';
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
        this.handleError('Error al descargar cronograma', 'No se pudo descargar el cronograma. Por favor, intenta de nuevo.');
      }
    );
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  openMergeDialog(budget: BudgetModel) {
    this.mergeParams = {
      budgetId1: budget.budgetId,
      budgetId2: null,
      newBudgetName: '',
      note: ''
    };
    this.displayMergeDialog = true;
  }

  mergeBudgets() {
    if (!this.mergeParams.budgetId1 || !this.mergeParams.budgetId2 || !this.mergeParams.newBudgetName) {
      this.handleError('Datos incompletos', 'Por favor, completa todos los campos requeridos.');
      return;
    }

    if (this.mergeParams.budgetId1 === this.mergeParams.budgetId2) {
      this.handleError('Error de validación', 'No puedes unir una cotización consigo misma. Selecciona dos cotizaciones diferentes.');
      return;
    }

    this.displayMergeDialog = false;
    this.spinner.show();
    this.loading = true;

    const mergeRequest = {
      budgetId1: this.mergeParams.budgetId1,
      budgetId2: this.mergeParams.budgetId2,
      newBudgetName: this.mergeParams.newBudgetName,
      note: this.mergeParams.note
    };

    this.budgetService.mergeBudgets(mergeRequest).subscribe(
      (response: any) => {
        this.loadBudgets();
        this.spinner.hide();
        this.loading = false;
        this.showModal(false, '¡Las cotizaciones se han unido exitosamente! Se ha creado una nueva cotización.', '¡Unión Exitosa!');
      },
      (error) => {
        this.spinner.hide();
        this.loading = false;
        this.handleError('Error al unir cotizaciones', 'No se pudieron unir las cotizaciones. Por favor, intenta de nuevo.');
      }
    );
  }

  getAvailableBudgetsForMerge(): BudgetModel[] {
    return this.budgets.filter(b => b.budgetId !== this.mergeParams.budgetId1);
  }

  getSelectedBudgetLabel(): string {
    const budget = this.budgets.find(b => b.budgetId === this.mergeParams.budgetId1);
    return budget ? `${budget.internalCode} - ${budget.budgetName}` : '';
  }

  // Métodos para grabación de audio con IA
  async toggleRecordingAI() {
    if (this.isRecording) {
      this.stopRecordingAI();
    } else {
      await this.startRecordingAI();
    }
  }

  async startRecordingAI() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Priorizar mp4/m4a que es más compatible con el backend
      let mimeType = 'audio/mp4';
      if (!MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/webm;codecs=opus';
      }
      
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType
      });
      
      this.audioChunks = [];
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.processRecordingAI();
        stream.getTracks().forEach(track => track.stop());
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('Error en grabación:', event);
        this.isRecording = false;
        this.isProcessingAI = false;
        this.aiProcessingStatus = '';
        this.handleError('Grabación', 'Error durante la grabación de audio.');
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      this.isProcessingAI = true;
      this.aiProcessingStatus = '🎤 Escuchando...';
    } catch (error) {
      console.error('Error al iniciar la grabación:', error);
      this.isProcessingAI = false;
      this.aiProcessingStatus = '';
      this.handleError('Grabación', 'No se pudo acceder al micrófono. Verifica los permisos.');
    }
  }

  stopRecordingAI() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
    }
  }

  async processRecordingAI() {
    if (this.audioChunks.length === 0) {
      this.isProcessingAI = false;
      this.aiProcessingStatus = '';
      this.handleError('Grabación', 'No se pudo grabar audio.');
      return;
    }

    this.aiProcessingStatus = '🔄 Procesando Audio...';

    // Unir los fragmentos grabados
    const audioBlob = new Blob(this.audioChunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' });

    // Convertir a WAV PCM 16kHz, 16bit, mono
    try {
      const wavBlob = await convertBlobToWavPcm16kMono(audioBlob);
      await this.sendAudioToGenerateBudget(wavBlob, 'wav');
    } catch (error) {
      console.error('Error al convertir audio a WAV:', error);
      this.isProcessingAI = false;
      this.aiProcessingStatus = '';
      this.handleError('Conversión de Audio', 'No se pudo convertir el audio a formato WAV PCM 16kHz, 16bit, mono.');
    }
  }

  async sendAudioToGenerateBudget(audioBlob: Blob, fileExtension: string) {
    this.spinner.show();
    this.loading = true;
    
    try {
      const formData = new FormData();
      formData.append('audioFile', audioBlob, `recording.${fileExtension}`);

      // Paso 1: Convertir audio a texto
      this.aiProcessingStatus = '🔊 Convirtiendo audio a texto...';
      
      this.budgetService.audioToText(formData).subscribe({
        next: (audioResponse: any) => {
          // audioResponse tiene { text: string, fileName: string }
          const transcribedText = audioResponse?.text;
          
          if (!transcribedText || transcribedText.trim() === '') {
            this.spinner.hide();
            this.loading = false;
            this.isProcessingAI = false;
            this.aiProcessingStatus = '';
            this.handleError('Audio no reconocido', 'No se pudo entender el audio. Por favor, habla más claro y fuerte e inténtalo de nuevo.');
            return;
          }

          // Paso 2: Generar cotización con IA usando el texto transcrito
          this.aiProcessingStatus = '🧠 Creando Cotización con IA...';
          
          this.budgetService.generateByAI(transcribedText).subscribe({
            next: (budgetResponse: any) => {
              this.spinner.hide();
              this.loading = false;
              this.isProcessingAI = false;
              this.aiProcessingStatus = '';
              this.loadBudgets(); // Recargar listado de cotizaciones
              this.showModal(false, '¡La cotización ha sido creada exitosamente con IA!', '¡Cotización Creada!');
            },
            error: (error: any) => {
              this.spinner.hide();
              this.loading = false;
              this.isProcessingAI = false;
              this.aiProcessingStatus = '';
              console.error('Error al generar cotización con IA:', error);
              this.handleError('Error al crear cotización', 'No se pudo generar la cotización con IA. Por favor, intenta de nuevo.');
            }
          });
        },
        error: (error: any) => {
          this.spinner.hide();
          this.loading = false;
          this.isProcessingAI = false;
          this.aiProcessingStatus = '';
          console.error('Error al convertir audio a texto:', error);
          this.handleError('Audio no reconocido', 'No se pudo entender el audio. Por favor, habla más claro y fuerte e inténtalo de nuevo.');
        }
      });
    } catch (error) {
      this.spinner.hide();
      this.loading = false;
      this.isProcessingAI = false;
      this.aiProcessingStatus = '';
      console.error('Error al enviar audio:', error);
      this.handleError('Envío de Audio', 'Error al enviar el audio al servidor.');
    }
  }

}