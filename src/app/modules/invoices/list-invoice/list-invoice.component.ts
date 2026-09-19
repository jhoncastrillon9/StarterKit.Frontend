import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { InvoiceModel, INVOICE_STATUS } from '../models/invoice.Model';
import { InvoiceService } from '../services/invoice.service';
import { DataTableColumn, KpiDef } from 'src/app/shared/ui/data-table/data-table.types';
import { ChipOption } from 'src/app/shared/ui/filter-chips/filter-chips.component';
import { EmailSelectorModalComponent, EmailSelectionResult } from 'src/app/shared/components/email-selector-modal/email-selector-modal.component';
import { extractApiErrorMessage, isValidationProblemDetails } from 'src/app/shared/api-error';
import { CustomerService } from 'src/app/modules/customers/services/customer.service';
import { CorrectInvoiceModalComponent } from 'src/app/modules/electronic-invoicing/correct-invoice-modal.component';

@Component({
  selector: 'app-list-invoice',
  templateUrl: './list-invoice.component.html',
  styleUrls: ['./list-invoice.component.scss']
})
export class ListInvoiceComponent implements OnInit {
  @ViewChild('emailSelectorModal') emailSelectorModal!: EmailSelectorModalComponent;
  @ViewChild('correctModal') correctModal!: CorrectInvoiceModalComponent;

  private readonly errorLoadMessage = 'Algo fallo al obtener las facturas. Refresca la pagina.';
  private readonly errorDownloadMessage = 'No se pudo descargar el PDF de la factura. Intenta de nuevo.';
  private readonly errorSendMessage = 'No se pudo enviar la factura por correo. Intenta de nuevo.';
  private readonly successSendMessage = 'La factura ha sido enviada por correo correctamente.';

  loading: boolean = true;
  invoices: InvoiceModel[] = [];

  /**
   * Array estable para [value] de app-data-table: nunca debe ser un getter, ya que
   * se recalcularia en cada ciclo de deteccion de cambios y romperia la paginacion
   * (ver nota en list-budget.component.ts). Se recalcula explicitamente al recargar.
   */
  filteredInvoices: InvoiceModel[] = [];

  invoiceToSend: InvoiceModel | null = null;
  availableEmails: string[] = [];

  tableColumns: DataTableColumn[] = [
    { field: 'fullNumber', header: 'Numero', sortable: true, filter: { type: 'text', placeholder: 'Numero' } },
    { field: 'issueDate', header: 'Fecha de emision', sortable: true, filter: { type: 'dateRange' } },
    { field: 'customerDto.customerName', header: 'Cliente', sortable: true, filter: { type: 'text', placeholder: 'Cliente' } },
    { field: 'budgetInternalCode', header: 'Cotizacion de origen', sortable: true, filter: { type: 'text', placeholder: 'Cotizacion' } },
    { field: 'total', header: 'Total', sortable: true, align: 'right', filter: { type: 'numericRange' } },
    {
      field: 'status', header: 'Estado', sortable: true, align: 'center',
      filter: {
        type: 'select',
        options: [
          { label: INVOICE_STATUS.draft, value: INVOICE_STATUS.draft },
          { label: INVOICE_STATUS.issued, value: INVOICE_STATUS.issued },
          { label: INVOICE_STATUS.sent, value: INVOICE_STATUS.sent },
        ]
      }
    },
    { field: 'acciones', header: 'Acciones', align: 'right' },
  ];

  /** Estado seleccionado en los chips de la cabecera. */
  activeStatusFilter = 'Todas';

  get kpis(): KpiDef[] {
    const emitidas = this.invoices.filter(i => i.status !== INVOICE_STATUS.draft);
    const facturado = emitidas.reduce((acc, i) => acc + (i.total || 0), 0);
    return [
      { key: 'total', label: 'Facturas', value: this.invoices.length, dotColor: '#6d28d9' },
      { key: 'emitidas', label: 'Emitidas', value: emitidas.length, dotColor: '#15703f' },
      { key: 'facturado', label: 'Total facturado', value: '$ ' + facturado.toLocaleString('es-CO'), dotColor: '#1d4ed8' },
    ];
  }

  get chipOptions(): ChipOption[] {
    return [
      { label: 'Todas', value: 'Todas', count: this.invoices.length },
      { label: INVOICE_STATUS.draft, value: INVOICE_STATUS.draft, count: this.countByStatus(INVOICE_STATUS.draft) },
      { label: INVOICE_STATUS.issued, value: INVOICE_STATUS.issued, count: this.countByStatus(INVOICE_STATUS.issued) },
      { label: INVOICE_STATUS.sent, value: INVOICE_STATUS.sent, count: this.countByStatus(INVOICE_STATUS.sent) },
    ];
  }

  private countByStatus(status: string): number {
    return this.invoices.filter(i => i.status === status).length;
  }

  onChipChange(value: string): void {
    this.activeStatusFilter = value;
    this.recalcFilteredInvoices();
  }

  constructor(
    private invoiceService: InvoiceService,
    private router: Router,
    private customerService: CustomerService,
    private messageService: MessageService
  ) { }

  ngOnInit(): void {
    this.loadInvoices();
  }

  loadInvoices(): void {
    this.loading = true;
    this.invoiceService.get().subscribe({
      next: (invoices) => {
        this.invoices = invoices;
        this.recalcFilteredInvoices();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar facturas', error);
        this.loading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: this.errorLoadMessage, life: 4000 });
      }
    });
  }

  /**
   * Array estable para [value] de app-data-table: se recalcula solo al cambiar
   * los datos o el chip activo, nunca en cada ciclo de deteccion de cambios
   * (mismo motivo que en el listado de cotizaciones: devolver un array nuevo en
   * cada tick reinicia la paginacion cuando hay filtros de columna).
   */
  private recalcFilteredInvoices(): void {
    this.filteredInvoices = this.activeStatusFilter === 'Todas'
      ? [...this.invoices]
      : this.invoices.filter(i => i.status === this.activeStatusFilter);
  }

  displayNumber(invoice: InvoiceModel): string {
    return invoice.fullNumber ? invoice.fullNumber : INVOICE_STATUS.draft;
  }

  canEdit(invoice: InvoiceModel): boolean {
    return invoice.status === INVOICE_STATUS.draft;
  }

  canSend(invoice: InvoiceModel): boolean {
    return invoice.status === INVOICE_STATUS.issued || invoice.status === INVOICE_STATUS.sent;
  }

  /**
   * Corregir solo tiene sentido sobre lo que ya salio. Un borrador se edita, y
   * por eso el boton no aparece ahi: ofrecer las dos cosas a la vez invita a
   * corregir con una nota algo que todavia se podia cambiar.
   */
  canCorrect(invoice: InvoiceModel): boolean {
    return invoice.status === INVOICE_STATUS.issued || invoice.status === INVOICE_STATUS.sent;
  }

  openCorrectModal(invoice: InvoiceModel): void {
    this.correctModal.show(invoice.invoiceId, this.displayNumber(invoice));
  }

  sendActionLabel(invoice: InvoiceModel): string {
    return invoice.status === INVOICE_STATUS.sent ? 'Reenviar' : 'Enviar';
  }

  editInvoice(invoice: InvoiceModel): void {
    this.router.navigate(['/invoices/edit', invoice.invoiceId]);
  }

  downloadPdf(invoice: InvoiceModel): void {
    this.invoiceService.downloadPdf(invoice.invoiceId).subscribe({
      next: (data: Blob) => {
        const url = window.URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Factura_' + (invoice.fullNumber || invoice.invoiceId) + '.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error al descargar el PDF de la factura', error);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: this.backendMessageOr(error, this.errorDownloadMessage), life: 5000 });
      }
    });
  }

  openSendModal(invoice: InvoiceModel): void {
    this.invoiceToSend = invoice;
    const emailString = invoice.customerDto?.email || '';
    this.availableEmails = emailString
      .split(/[;,]/)
      .map(e => e.trim())
      .filter(e => e.length > 0);

    // Si el cliente no tiene correos ya NO se aborta: el modal permite escribir uno nuevo.

    this.emailSelectorModal.emails = this.availableEmails;
    this.emailSelectorModal.title = invoice.status === INVOICE_STATUS.sent ? 'Reenviar factura' : 'Enviar factura';
    this.emailSelectorModal.confirmButtonText = invoice.status === INVOICE_STATUS.sent ? 'Reenviar factura' : 'Enviar factura';
    this.emailSelectorModal.openModal();
  }

  onEmailsSelected(result: EmailSelectionResult): void {
    if (!this.invoiceToSend) { return; }
    const invoice = this.invoiceToSend;
    this.invoiceToSend = null;

    // Primero guardar los correos nuevos en el cliente, despues enviar (ver la nota
    // equivalente en list-budget: guardar es recuperable, enviar no).
    this.persistNewCustomerEmails(invoice, result.newEmails, () => this.sendInvoice(invoice, result.emails));
  }

  /**
   * Guarda los correos escritos en el modal en la ficha del cliente y luego ejecuta
   * `proceed()`. Un fallo al guardar no cancela el envio: se avisa aparte con un toast.
   */
  private persistNewCustomerEmails(invoice: InvoiceModel, newEmails: string[], proceed: () => void): void {
    const customerId = invoice.customerDto?.customerId;
    if (!newEmails || newEmails.length === 0 || !customerId) {
      proceed();
      return;
    }

    this.customerService.addEmails(customerId, newEmails).subscribe({
      next: (updatedCustomer: any) => {
        this.applyUpdatedCustomer(updatedCustomer);
        proceed();
      },
      error: (error) => {
        console.error('Error al guardar los correos nuevos en el cliente', error);
        const detalle = extractApiErrorMessage(error);
        this.messageService.add({
          severity: 'warn',
          summary: 'Correo no guardado en el cliente',
          detail: 'El envio continua, pero el correo nuevo no se pudo guardar en la ficha del cliente.'
            + (detalle ? ' Detalle: ' + detalle : ''),
          life: 6000
        });
        proceed();
      }
    });
  }

  /** Refresca en memoria el email del cliente en todas las facturas cargadas de ese cliente. */
  private applyUpdatedCustomer(updatedCustomer: any): void {
    if (!updatedCustomer || !updatedCustomer.customerId) { return; }
    this.invoices.forEach(i => {
      if (i.customerDto && i.customerDto.customerId === updatedCustomer.customerId) {
        i.customerDto.email = updatedCustomer.email;
      }
    });
  }

  private sendInvoice(invoice: InvoiceModel, selectedEmails: string[]): void {
    this.loading = true;
    this.invoiceService.send(invoice.invoiceId, selectedEmails).subscribe({
      next: () => {
        this.loading = false;
        this.messageService.add({ severity: 'success', summary: 'Factura enviada', detail: this.successSendMessage, life: 3500 });
        this.loadInvoices();
      },
      error: (error) => {
        console.error('Error al enviar la factura', error);
        this.loading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: this.backendMessageOr(error, this.errorSendMessage), life: 5000 });
      }
    });
  }

  /**
   * Esta pantalla mostraba siempre un texto generico y se tragaba los 400 utiles del
   * backend ("La factura debe estar emitida antes de enviarla."). Ahora usa la misma
   * extraccion que edit-invoice e invoice-resolution, que entiende tanto el contrato
   * { error: mensaje } como ValidationProblemDetails ({ errors: {...} }).
   */
  private backendMessageOr(error: any, fallbackMessage: string): string {
    const backendMessage = extractApiErrorMessage(error);
    if (!backendMessage) { return fallbackMessage; }
    if (isValidationProblemDetails(error)) {
      // Texto tecnico de .NET: se acompana del mensaje propio para que sirva de algo.
      return fallbackMessage + ' Detalle: ' + backendMessage;
    }
    return backendMessage;
  }
}
