import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { InvoiceModel, INVOICE_STATUS } from '../models/invoice.Model';
import { InvoiceService } from '../services/invoice.service';
import { DataTableColumn } from 'src/app/shared/ui/data-table/data-table.types';
import { EmailSelectorModalComponent } from 'src/app/shared/components/email-selector-modal/email-selector-modal.component';
import { extractApiErrorMessage, isValidationProblemDetails } from 'src/app/shared/api-error';

@Component({
  selector: 'app-list-invoice',
  templateUrl: './list-invoice.component.html',
  styleUrls: ['./list-invoice.component.scss']
})
export class ListInvoiceComponent implements OnInit {
  @ViewChild('emailSelectorModal') emailSelectorModal!: EmailSelectorModalComponent;

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
    { field: 'budgetInternalCode', header: 'Cotizacion de origen', sortable: true },
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

  constructor(
    private invoiceService: InvoiceService,
    private router: Router,
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

  private recalcFilteredInvoices(): void {
    this.filteredInvoices = [...this.invoices];
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

    if (this.availableEmails.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Sin correos', detail: 'El cliente no tiene correos electronicos configurados.', life: 4000 });
      return;
    }

    this.emailSelectorModal.emails = this.availableEmails;
    this.emailSelectorModal.title = invoice.status === INVOICE_STATUS.sent ? 'Reenviar factura' : 'Enviar factura';
    this.emailSelectorModal.confirmButtonText = invoice.status === INVOICE_STATUS.sent ? 'Reenviar factura' : 'Enviar factura';
    this.emailSelectorModal.openModal();
  }

  onEmailsSelected(selectedEmails: string[]): void {
    if (!this.invoiceToSend) { return; }
    const invoice = this.invoiceToSend;
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
    this.invoiceToSend = null;
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
