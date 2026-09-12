import { Component, OnInit, ViewChild } from '@angular/core';
import { ConfirmationModalComponent } from 'src/app/shared/components/reusable-modal/reusable-modal.component';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { InvoiceResolutionModel } from '../models/invoice.Model';
import { InvoiceResolutionService } from '../services/invoice-resolution.service';
import { extractApiErrorMessage, isValidationProblemDetails } from 'src/app/shared/api-error';

/** Bajo este numero de folios restantes se avisa para tramitar una resolucion nueva. */
const LOW_REMAINING_THRESHOLD = 50;
/** Bajo este numero de dias para el vencimiento se avisa que la vigencia esta por terminar. */
const EXPIRING_SOON_DAYS = 30;

@Component({
  selector: 'app-invoice-resolution',
  templateUrl: './invoice-resolution.component.html',
  styleUrls: ['./invoice-resolution.component.scss']
})
export class InvoiceResolutionComponent implements OnInit {
  /**
   * La accion de confirmar se enlaza por plantilla ((confirmAction)="onReplaceConfirmed()").
   * Nunca suscribirse aqui de forma imperativa: ConfirmationModalComponent ya no recrea su
   * EventEmitter al cerrarse, asi que una suscripcion por apertura se acumularia y el
   * segundo intento reemplazaria la resolucion dos veces.
   */
  @ViewChild('replaceConfirmModal') replaceConfirmModal!: ConfirmationModalComponent;


  private readonly errorLoadMessage = 'Algo fallo al obtener la resolucion de facturacion. Refresca la pagina.';
  private readonly errorSaveMessage = 'No se pudo guardar la resolucion. Intenta de nuevo.';

  loading = true;
  saving = false;

  /** null cuando todavia no hay ninguna resolucion configurada (404 del backend). */
  resolution: InvoiceResolutionModel | null = null;

  form: FormGroup;

  /** Mensaje de negocio devuelto tal cual por el backend (400 { error: '...' }). */
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private invoiceResolutionService: InvoiceResolutionService,
    private messageService: MessageService
  ) {
    this.form = this.fb.group({
      resolutionNumber: ['', [Validators.required]],
      prefix: ['', [Validators.required]],
      rangeFrom: [null, [Validators.required, Validators.min(1)]],
      rangeTo: [null, [Validators.required, Validators.min(1)]],
      validFrom: [null, [Validators.required]],
      validTo: [null, [Validators.required]],
    });
  }

  ngOnInit(): void {
    this.loadResolution();
  }

  loadResolution(): void {
    this.loading = true;
    this.invoiceResolutionService.get().subscribe({
      next: (resolution) => {
        this.applyResolution(resolution);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar la resolucion de facturacion', error);
        this.loading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: this.errorLoadMessage, life: 4000 });
      }
    });
  }

  private applyResolution(resolution: InvoiceResolutionModel | null): void {
    this.resolution = resolution;

    if (resolution) {
      this.form.patchValue({
        resolutionNumber: resolution.resolutionNumber,
        prefix: resolution.prefix,
        rangeFrom: resolution.rangeFrom,
        rangeTo: resolution.rangeTo,
        validFrom: resolution.validFrom ? resolution.validFrom.substring(0, 10) : null,
        validTo: resolution.validTo ? resolution.validTo.substring(0, 10) : null,
      }, { emitEvent: false });
    } else {
      this.form.reset({ emitEvent: false });
    }
  }

  /** Numeros de folios disponibles: aun no llega a la alerta de agotarse. */
  get hasLowRemaining(): boolean {
    return !!this.resolution && this.resolution.remaining < LOW_REMAINING_THRESHOLD;
  }

  /** Dias que faltan para que venza la vigencia (negativo si ya vencio). */
  get daysUntilExpiration(): number | null {
    if (!this.resolution || !this.resolution.validTo) { return null; }
    const validTo = new Date(this.resolution.validTo);
    const today = new Date();
    validTo.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.round((validTo.getTime() - today.getTime()) / msPerDay);
  }

  get isExpiringSoon(): boolean {
    if (!this.resolution || this.resolution.isExpired) { return false; }
    const days = this.daysUntilExpiration;
    return days !== null && days <= EXPIRING_SOON_DAYS;
  }

  /**
   * true cuando cambiar el prefijo o el inicio del rango en el formulario va a hacer que
   * el backend desactive la resolucion actual y cree una nueva (solo aplica si ya existe
   * una resolucion guardada y ya emitio facturas).
   *
   * La condicion es currentNumber >= rangeFrom, la misma que usa el backend en
   * InvoiceResolutionApplicationService: currentNumber arranca en rangeFrom - 1 y sube
   * uno por cada factura emitida, asi que tras la PRIMERA factura ya vale rangeFrom.
   * Con una comparacion estricta el aviso no aparecia justo en ese caso.
   */
  get willReplaceResolution(): boolean {
    if (!this.resolution) { return false; }
    const hasIssuedInvoices = this.resolution.currentNumber >= this.resolution.rangeFrom;
    if (!hasIssuedInvoices) { return false; }
    const prefixChanged = this.form.get('prefix')?.value !== this.resolution.prefix;
    const rangeFromChanged = Number(this.form.get('rangeFrom')?.value) !== this.resolution.rangeFrom;
    return prefixChanged || rangeFromChanged;
  }

  private buildPayload(): InvoiceResolutionModel {
    const formValue = this.form.getRawValue();
    return {
      invoiceResolutionId: this.resolution?.invoiceResolutionId ?? 0,
      resolutionNumber: formValue.resolutionNumber,
      prefix: formValue.prefix,
      rangeFrom: Number(formValue.rangeFrom),
      rangeTo: Number(formValue.rangeTo),
      currentNumber: this.resolution?.currentNumber ?? 0,
      validFrom: formValue.validFrom,
      validTo: formValue.validTo,
      isActive: this.resolution?.isActive ?? true,
      remaining: this.resolution?.remaining ?? 0,
      isExpired: this.resolution?.isExpired ?? false,
    };
  }

  /**
   * Reemplazar la resolucion (cambiar el prefijo o el inicio del rango cuando ya emitio
   * facturas) hace que el backend desactive la vigente y cree una nueva. La unica
   * proteccion era un banner en linea, y como el formulario usa (ngSubmit)="save()" un
   * simple Enter dentro de cualquier input lo disparaba. Emitir una factura, que es
   * menos grave, si pide confirmacion: aqui tambien.
   */
  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.messageService.add({ severity: 'warn', summary: 'Revisa el formulario', detail: 'Completa los campos obligatorios antes de guardar.', life: 4000 });
      return;
    }

    if (this.willReplaceResolution) {
      this.openReplaceConfirm();
      return;
    }

    this.persist(false);
  }

  private openReplaceConfirm(): void {
    const nuevoPrefijo = this.form.get('prefix')?.value;
    const nuevoDesde = this.form.get('rangeFrom')?.value;

    this.replaceConfirmModal.title = 'Reemplazar la resolucion vigente';
    this.replaceConfirmModal.messageModal =
      `Vas a cambiar el prefijo o el inicio del rango de una resolucion que ya emitio facturas. `
      + `Al guardar, la resolucion vigente (${this.resolution?.prefix} desde ${this.resolution?.rangeFrom}) se desactivara `
      + `y se creara una nueva (${nuevoPrefijo} desde ${nuevoDesde}), que sera la que numere las proximas facturas. `
      + `Las facturas ya emitidas conservan su numero. ¿Deseas continuar?`;
    this.replaceConfirmModal.isModalError = false;
    this.replaceConfirmModal.isConfirmation = true;
    this.replaceConfirmModal.titleButtonComfimationYes = 'Si, reemplazar';
    this.replaceConfirmModal.openModal();
  }

  /** Punto de entrada del binding de plantilla al confirmar el reemplazo. */
  onReplaceConfirmed(): void {
    this.persist(true);
  }

  private persist(isReplacement: boolean): void {
    this.clearBusinessError();
    this.saving = true;
    const payload = this.buildPayload();
    this.invoiceResolutionService.save(payload).subscribe({
      next: (updated) => {
        this.saving = false;
        this.applyResolution(updated);
        this.messageService.add({
          severity: 'success',
          summary: isReplacement ? 'Resolucion reemplazada' : 'Resolucion guardada',
          detail: isReplacement
            ? 'Se desactivo la resolucion anterior y se creo una nueva: las proximas facturas usaran el prefijo ' + updated.prefix + ' desde el numero ' + updated.rangeFrom + '.'
            : 'La resolucion de facturacion se guardo correctamente.',
          life: isReplacement ? 6000 : 3500
        });
      },
      error: (error) => {
        this.saving = false;
        this.handleBusinessError(error);
      }
    });
  }

  goToInvoiceList(): void {
    this.router.navigate(['/invoices/invoices']);
  }

  private clearBusinessError(): void {
    this.errorMessage = null;
  }

  /**
   * Los errores de negocio llegan como 400 con { error: 'mensaje en espanol' }, y las
   * validaciones de ModelState como ValidationProblemDetails ({ errors: {...} }).
   * extractApiErrorMessage entiende las dos formas (ver src/app/shared/api-error.ts).
   */
  private handleBusinessError(error: any): void {
    console.error('Error de negocio en la resolucion de facturacion', error);
    const backendMessage = extractApiErrorMessage(error);
    let message = backendMessage || this.errorSaveMessage;
    if (backendMessage && isValidationProblemDetails(error)) {
      // Texto tecnico de .NET: se antepone una explicacion util en espanol.
      message = 'Hay datos de la resolucion que el servidor no acepta. Revisa el prefijo, '
        + 'el rango (numeros enteros) y las fechas de vigencia. Detalle: ' + backendMessage;
    }
    this.errorMessage = message;
    this.messageService.add({ severity: 'error', summary: 'No se pudo guardar', detail: message, life: 6000 });
  }
}
