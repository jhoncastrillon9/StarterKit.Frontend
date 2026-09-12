import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { INVOICE_STATUS, InvoiceDetailModel, InvoiceModel } from '../models/invoice.Model';
import { InvoiceService } from '../services/invoice.service';
import { EmailSelectorModalComponent } from 'src/app/shared/components/email-selector-modal/email-selector-modal.component';
import { ConfirmationModalComponent } from 'src/app/shared/components/reusable-modal/reusable-modal.component';
import { extractApiErrorMessage, isValidationProblemDetails } from 'src/app/shared/api-error';

@Component({
  selector: 'app-edit-invoice',
  templateUrl: './edit-invoice.component.html',
  styleUrls: ['./edit-invoice.component.scss']
})
export class EditInvoiceComponent implements OnInit {
  @ViewChild('emailSelectorModal') emailSelectorModal!: EmailSelectorModalComponent;
  @ViewChild('issueConfirmModal') issueConfirmModal!: ConfirmationModalComponent;

  /** Unidades validas para los items de la factura. */
  readonly unitOptions: string[] = ['Und', 'M2', 'M3', 'ML', 'kg', 'hr', 'mes', 'km', 'Carga', 'M3-km', 'jgo', 'lt', 'ton-m', 'HA'];

  readonly INVOICE_STATUS = INVOICE_STATUS;

  private readonly errorLoadMessage = 'Algo fallo al obtener la factura. Refresca la pagina.';
  private readonly errorSaveMessage = 'No se pudo guardar el borrador. Intenta de nuevo.';
  private readonly errorIssueMessage = 'No se pudo emitir la factura. Intenta de nuevo.';
  /** Mismo texto de validacion para "Guardar borrador" y para emitir con cambios sin guardar. */
  private readonly invalidFormMessage = 'Completa los campos obligatorios de los items antes de guardar. La cantidad debe ser un numero entero mayor o igual a 1.';

  loading = true;
  saving = false;
  issuing = false;

  invoiceId = 0;
  invoice: InvoiceModel | null = null;

  form: FormGroup;

  /** Mensaje de negocio devuelto tal cual por el backend (400 { error: '...' }). */
  errorMessage: string | null = null;
  /** true cuando el error indica que falta configurar la resolucion de facturacion. */
  showResolutionLink = false;

  availableEmails: string[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private invoiceService: InvoiceService,
    private messageService: MessageService
  ) {
    this.form = this.fb.group({
      dueDate: [null],
      wayToPay: [''],
      note: [''],
      hasIVA: [true],
      hasAIU: [true],
      sumAIU: [true],
      invoiceDetailsDto: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      this.invoiceId = id;
      this.loadInvoice(id);
    });
  }

  get isReadOnly(): boolean {
    return !this.invoice || this.invoice.status !== INVOICE_STATUS.draft;
  }

  get details(): FormArray {
    return this.form.get('invoiceDetailsDto') as FormArray;
  }

  loadInvoice(id: number): void {
    this.loading = true;
    this.invoiceService.getById(id).subscribe({
      next: (invoice) => {
        this.applyInvoice(invoice);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar la factura', error);
        this.loading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: this.errorLoadMessage, life: 4000 });
      }
    });
  }

  private applyInvoice(invoice: InvoiceModel): void {
    this.invoice = invoice;

    this.form.patchValue({
      dueDate: invoice.dueDate ? invoice.dueDate.substring(0, 10) : null,
      wayToPay: invoice.wayToPay,
      note: invoice.note,
      hasIVA: invoice.hasIVA,
      hasAIU: invoice.hasAIU,
      sumAIU: invoice.sumAIU,
    }, { emitEvent: false });

    this.details.clear();
    (invoice.invoiceDetailsDto || []).forEach(detail => this.details.push(this.buildDetailGroup(detail)));

    if (this.isReadOnly) {
      this.form.disable({ emitEvent: false });
    } else {
      this.form.enable({ emitEvent: false });
    }
  }

  /**
   * Las filas de titulo/seccion (isTitle: true) solo llevan descripcion: no tienen
   * cantidad ni precio facturables, y por lo tanto no deben exigir esos campos ni
   * contar en los subtotales. Mismo patron que add-update-budget.component.ts
   * (ver addBudgetDetail/addTitleRow y updateAmount, que salta isTitle al sumar).
   */
  private buildDetailGroup(detail: Partial<InvoiceDetailModel>): FormGroup {
    const isTitle = !!detail.isTitle;
    return this.fb.group({
      invoiceDetailId: [detail.invoiceDetailId ?? 0],
      invoiceId: [detail.invoiceId ?? this.invoiceId],
      description: [detail.description ?? '', [Validators.required]],
      unitMeasurement: [isTitle ? '' : (detail.unitMeasurement ?? 'Und')],
      // Quantity es int en el backend (InvoiceDetailDTO / BudgetDetailDTO y la entidad):
      // un decimal no se puede deserializar y el guardado se va en un 400 de ModelState.
      // Mismo validador que add-update-budget.component.ts: solo digitos, minimo 1.
      quantity: [isTitle ? 0 : (detail.quantity ?? 1), isTitle ? [] : [Validators.required, Validators.pattern(/^\d+$/), Validators.min(1)]],
      price: [isTitle ? 0 : (detail.price ?? 0), isTitle ? [] : [Validators.required, Validators.min(0)]],
      isTitle: [isTitle],
    });
  }

  addDetail(): void {
    if (this.isReadOnly) { return; }
    this.details.push(this.buildDetailGroup({}));
  }

  addTitleRow(): void {
    if (this.isReadOnly) { return; }
    this.details.push(this.buildDetailGroup({ isTitle: true }));
  }

  removeDetail(index: number): void {
    if (this.isReadOnly) { return; }
    this.details.removeAt(index);
  }

  /** Bloquea todo lo que no sea un digito en el input de cantidad (mismo patron que add-update-budget). */
  onlyNumbers(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    if (charCode > 31 && (charCode < 48 || charCode > 57)) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  /** El keypress no cubre el pegado: se descarta si el texto pegado no son solo digitos. */
  onPasteOnlyNumbers(event: ClipboardEvent): void {
    const pasted = event.clipboardData?.getData('text') ?? '';
    if (!/^\d+$/.test(pasted.trim())) {
      event.preventDefault();
    }
  }

  isTitleRow(index: number): boolean {
    return !!this.details.at(index).get('isTitle')?.value;
  }

  lineTotal(index: number): number {
    const group = this.details.at(index);
    if (group.get('isTitle')?.value) { return 0; }
    const quantity = Number(group.get('quantity')?.value) || 0;
    const price = Number(group.get('price')?.value) || 0;
    return quantity * price;
  }

  /**
   * Suma de los items en el cliente, solo para feedback inmediato mientras se edita.
   * Las filas de titulo se excluyen (no tienen cantidad ni precio facturables), igual
   * que hace InvoiceDTO.Subtotal en el backend. Los totales definitivos (subtotal, aiu,
   * iva, total) siempre vienen del backend y se refrescan al guardar: nunca se muestran
   * como si fueran el total final.
   */
  get estimatedSubtotal(): number {
    return this.details.controls.reduce((sum, group) => {
      if (group.get('isTitle')?.value) { return sum; }
      const quantity = Number(group.get('quantity')?.value) || 0;
      const price = Number(group.get('price')?.value) || 0;
      return sum + (quantity * price);
    }, 0);
  }

  private buildPayload(): InvoiceModel {
    const formValue = this.form.getRawValue();
    const details: InvoiceDetailModel[] = formValue.invoiceDetailsDto.map((d: any) => ({
      invoiceDetailId: d.invoiceDetailId,
      invoiceId: this.invoiceId,
      description: d.description,
      unitMeasurement: d.isTitle ? '' : d.unitMeasurement,
      quantity: d.isTitle ? 0 : Number(d.quantity),
      price: d.isTitle ? 0 : Number(d.price),
      isTitle: !!d.isTitle,
      total: d.isTitle ? 0 : Number(d.quantity) * Number(d.price),
    }));

    return {
      ...this.invoice!,
      dueDate: formValue.dueDate,
      wayToPay: formValue.wayToPay,
      note: formValue.note,
      hasIVA: formValue.hasIVA,
      hasAIU: formValue.hasAIU,
      sumAIU: formValue.sumAIU,
      invoiceDetailsDto: details,
    };
  }

  saveDraft(): void {
    if (!this.invoice || this.isReadOnly) { return; }

    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.messageService.add({ severity: 'warn', summary: 'Revisa el formulario', detail: this.invalidFormMessage, life: 4000 });
      return;
    }

    this.clearBusinessError();
    this.saving = true;
    const payload = this.buildPayload();
    this.invoiceService.update(payload).subscribe({
      next: (updated) => {
        this.saving = false;
        this.applyInvoice(updated);
        this.messageService.add({ severity: 'success', summary: 'Borrador guardado', detail: 'El borrador de la factura se guardo correctamente.', life: 3500 });
      },
      error: (error) => {
        this.saving = false;
        this.handleBusinessError(error, this.errorSaveMessage);
      }
    });
  }

  openIssueConfirm(): void {
    if (!this.invoice || this.isReadOnly) { return; }
    this.issueConfirmModal.title = 'Emitir factura';
    this.issueConfirmModal.messageModal = 'Al emitir la factura se consumira el siguiente numero disponible de la resolucion y esta accion no se puede deshacer. ¿Deseas continuar?';
    this.issueConfirmModal.isModalError = false;
    this.issueConfirmModal.isConfirmation = true;
    this.issueConfirmModal.titleButtonComfimationYes = 'Si, emitir';
    this.issueConfirmModal.openModal();
  }

  confirmIssue(): void {
    if (!this.invoice || this.isReadOnly) { return; }
    this.clearBusinessError();
    this.issuing = true;
    this.invoiceService.issue(this.invoice.invoiceId).subscribe({
      next: (updated) => {
        this.issuing = false;
        this.applyInvoice(updated);
        this.messageService.add({ severity: 'success', summary: 'Factura emitida', detail: 'La factura fue emitida correctamente con el numero ' + updated.fullNumber + '.', life: 4500 });
      },
      error: (error) => {
        this.issuing = false;
        this.handleBusinessError(error, this.errorIssueMessage);
      }
    });
  }

  openIssueAndSendModal(): void {
    if (!this.invoice || this.isReadOnly) { return; }

    const emailString = this.invoice.customerDto?.email || '';
    this.availableEmails = emailString
      .split(/[;,]/)
      .map(e => e.trim())
      .filter(e => e.length > 0);

    if (this.availableEmails.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Sin correos', detail: 'El cliente no tiene correos electronicos configurados.', life: 4000 });
      return;
    }

    this.emailSelectorModal.emails = this.availableEmails;
    this.emailSelectorModal.title = 'Emitir y enviar factura';
    this.emailSelectorModal.message = 'Al continuar se emitira la factura (se consume el siguiente numero de la resolucion; no se puede deshacer) y se enviara a los correos seleccionados:';
    this.emailSelectorModal.confirmButtonText = 'Emitir y enviar';
    this.emailSelectorModal.openModal();
  }

  onIssueAndSendConfirmed(selectedEmails: string[]): void {
    if (!this.invoice || this.isReadOnly) { return; }

    this.clearBusinessError();
    this.issuing = true;
    const invoiceId = this.invoice.invoiceId;

    this.invoiceService.issue(invoiceId).subscribe({
      next: (issuedInvoice) => {
        this.applyInvoice(issuedInvoice);

        this.invoiceService.send(invoiceId, selectedEmails).subscribe({
          next: () => {
            this.issuing = false;
            this.messageService.add({
              severity: 'success',
              summary: 'Factura emitida y enviada',
              detail: 'La factura ' + issuedInvoice.fullNumber + ' fue emitida y enviada correctamente.',
              life: 4500
            });
          },
          error: (sendError) => {
            this.issuing = false;
            console.error('Error al enviar la factura despues de emitirla', sendError);
            // Caso especial: la factura ya quedo emitida, solo fallo el correo.
            // No se debe dar a entender que la facturacion fallo.
            this.messageService.add({
              severity: 'warn',
              summary: 'Factura emitida, envio pendiente',
              detail: 'La factura ' + issuedInvoice.fullNumber + ' se emitio correctamente, pero no pudo enviarse por correo. Puedes reenviarla desde el listado de facturas.',
              life: 8000
            });
          }
        });
      },
      error: (error) => {
        this.issuing = false;
        this.handleBusinessError(error, this.errorIssueMessage);
      }
    });
  }

  goToList(): void {
    this.router.navigate(['/invoices/invoices']);
  }

  goToResolutionConfig(): void {
    this.router.navigate(['/invoices/resolution']);
  }

  private clearBusinessError(): void {
    this.errorMessage = null;
    this.showResolutionLink = false;
  }

  /**
   * Los errores de negocio llegan como 400 con { error: 'mensaje en espanol' }, y las
   * validaciones de ModelState como ValidationProblemDetails ({ errors: {...} }).
   * extractApiErrorMessage entiende las dos formas (ver src/app/shared/api-error.ts).
   */
  private handleBusinessError(error: any, fallbackMessage: string): void {
    console.error('Error de negocio en factura', error);
    const backendMessage = extractApiErrorMessage(error);
    let message = backendMessage || fallbackMessage;
    if (backendMessage && isValidationProblemDetails(error)) {
      // Texto tecnico de .NET: se antepone una explicacion util en espanol.
      message = 'Hay datos de la factura que el servidor no acepta. Revisa los items '
        + '(la cantidad debe ser un numero entero) y vuelve a intentarlo. Detalle: ' + backendMessage;
    }
    this.errorMessage = message;
    this.showResolutionLink = this.isResolutionNotConfiguredError(message);
    this.messageService.add({ severity: 'error', summary: 'No se pudo completar la accion', detail: message, life: 6000 });
  }

  private isResolutionNotConfiguredError(message: string): boolean {
    const normalized = message.toLowerCase();
    if (!normalized.includes('resoluci')) { return false; }
    return normalized.includes('no hay') || normalized.includes('no existe') || normalized.includes('no esta configurada')
      || normalized.includes('no esta configurado') || normalized.includes('sin configurar') || normalized.includes('configura');
  }
}
