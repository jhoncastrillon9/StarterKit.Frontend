import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { isValidEmail } from 'src/app/shared/email-validation';

export interface EmailOption {
  email: string;
  selected: boolean;
}

/**
 * Payload de (confirmAction).
 *
 * Antes se emitía un string[] con los correos elegidos. Ahora el modal también deja
 * escribir destinatarios que no estaban en la ficha del cliente, y la pantalla que lo usa
 * necesita distinguirlos para poder guardarlos en el cliente. Van en el mismo evento (y no
 * en una salida aparte) justamente para que no se puedan desordenar: quien confirma recibe
 * de golpe "a quién enviar" y "qué habría que guardar antes de enviar".
 *
 * El modal NO llama a ningún servicio: decidir qué se hace con newEmails es de cada pantalla.
 */
export interface EmailSelectionResult {
  /** Todos los correos seleccionados: los de la ficha del cliente más los nuevos. */
  emails: string[];
  /** Solo los escritos por el usuario en esta apertura, que no venían en la ficha y siguen seleccionados. */
  newEmails: string[];
}

@Component({
  selector: 'app-email-selector-modal',
  templateUrl: './email-selector-modal.component.html',
  styleUrls: ['./email-selector-modal.component.scss']
})
export class EmailSelectorModalComponent implements OnChanges {
  @Input() emails: string[] = [];
  @Input() title: string = '¡Cotización en camino! 📬';
  @Input() message: string = 'Selecciona los correos a los que deseas enviar:';
  @Input() confirmButtonText: string = 'Enviar';

  @Output() confirmAction: EventEmitter<EmailSelectionResult> = new EventEmitter<EmailSelectionResult>();
  @Output() cancelAction: EventEmitter<void> = new EventEmitter<void>();

  visible: boolean = false;
  selectedEmails: string[] = [];

  /** Correos escritos a mano en esta apertura del modal (no vienen de [emails]). */
  newEmails: string[] = [];
  /** Texto del campo "añadir correo". */
  newEmailInput: string = '';
  /** Error de validación del campo "añadir correo" (vacío = sin error). */
  newEmailError: string = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['emails'] && this.emails) {
      // Por defecto, todos los emails están seleccionados. Los escritos a mano se
      // conservan: varias pantallas asignan [emails] justo antes de abrir y este hook
      // se dispara en el siguiente ciclo de detección, ya con el modal visible.
      this.selectedEmails = [...this.emails, ...this.newEmails];
    }
  }

  /** Ficha del cliente + los escritos a mano, en el orden en que se ven. */
  get allEmails(): string[] {
    return [...this.emails, ...this.newEmails];
  }

  openModal() {
    // Esta es una instancia compartida por varios flujos (enviar PDF, enviar Excel,
    // facturar, reenviar factura). Todo el estado de "correos nuevos" tiene que
    // reiniciarse aquí o se filtra del flujo anterior al siguiente, y se acabaría
    // guardando en el cliente B un correo que se escribió para el cliente A.
    this.newEmails = [];
    this.newEmailInput = '';
    this.newEmailError = '';
    this.selectedEmails = [...this.emails];
    this.visible = true;
  }

  closeModal() {
    this.visible = false;
  }

  removeEmail(email: string) {
    const index = this.selectedEmails.indexOf(email);
    if (index >= 0) {
      this.selectedEmails.splice(index, 1);
    }
  }

  addEmail(email: string) {
    if (!this.selectedEmails.includes(email)) {
      this.selectedEmails.push(email);
    }
  }

  isSelected(email: string): boolean {
    return this.selectedEmails.includes(email);
  }

  toggleEmail(email: string) {
    if (this.isSelected(email)) {
      this.removeEmail(email);
    } else {
      this.addEmail(email);
    }
  }

  /** Comparación sin distinguir mayúsculas: los correos no son sensibles a la caja. */
  private alreadyListed(email: string): boolean {
    const normalized = email.toLowerCase();
    return this.allEmails.some(e => e.trim().toLowerCase() === normalized);
  }

  /**
   * Añade el correo escrito en el campo de texto. Queda seleccionado de inmediato:
   * si el usuario se molesta en escribirlo es porque quiere enviárselo.
   */
  addNewEmail(): void {
    const email = (this.newEmailInput || '').trim();

    if (!email) {
      this.newEmailError = 'Escribe un correo electrónico.';
      return;
    }
    if (!isValidEmail(email)) {
      this.newEmailError = 'El correo "' + email + '" no tiene un formato válido.';
      return;
    }
    if (this.alreadyListed(email)) {
      this.newEmailError = 'El correo "' + email + '" ya está en la lista.';
      return;
    }

    this.newEmails.push(email);
    this.addEmail(email);
    this.newEmailInput = '';
    this.newEmailError = '';
  }

  /** El error deja de tener sentido en cuanto el usuario vuelve a escribir. */
  onNewEmailInputChange(): void {
    if (this.newEmailError) {
      this.newEmailError = '';
    }
  }

  confirm() {
    // Mismo vector que en ConfirmationModalComponent: closeModal() solo pone
    // visible=false y el fade-out del c-modal deja el boton clicable ~150ms mas.
    // Sin este guard, un doble clic emite dos veces (aqui son envios de correo y,
    // desde list-budget, emisiones de factura).
    if (!this.visible) { return; }

    if (this.selectedEmails.length > 0) {
      // Solo se reportan como nuevos los que siguen seleccionados: si el usuario
      // escribió un correo y luego quitó el chip (típico al corregir un dedazo), no
      // tiene sentido guardarlo en la ficha del cliente.
      const newEmails = this.newEmails.filter(e => this.isSelected(e));
      this.confirmAction.emit({ emails: [...this.selectedEmails], newEmails });
      this.closeModal();
    }
  }

  cancel() {
    this.cancelAction.emit();
    this.closeModal();
  }

  selectAll() {
    this.selectedEmails = this.allEmails;
  }

  deselectAll() {
    this.selectedEmails = [];
  }
}
