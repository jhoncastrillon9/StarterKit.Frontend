import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';

export interface EmailOption {
  email: string;
  selected: boolean;
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
  
  @Output() confirmAction: EventEmitter<string[]> = new EventEmitter<string[]>();
  @Output() cancelAction: EventEmitter<void> = new EventEmitter<void>();

  visible: boolean = false;
  selectedEmails: string[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['emails'] && this.emails) {
      // Por defecto, todos los emails están seleccionados
      this.selectedEmails = [...this.emails];
    }
  }

  openModal() {
    // Reiniciar la selección cuando se abre el modal (todos seleccionados por defecto)
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

  confirm() {
    // Mismo vector que en ConfirmationModalComponent: closeModal() solo pone
    // visible=false y el fade-out del c-modal deja el boton clicable ~150ms mas.
    // Sin este guard, un doble clic emite dos veces (aqui son envios de correo y,
    // desde list-budget, emisiones de factura).
    if (!this.visible) { return; }

    if (this.selectedEmails.length > 0) {
      this.confirmAction.emit([...this.selectedEmails]);
      this.closeModal();
    }
  }

  cancel() {
    this.cancelAction.emit();
    this.closeModal();
  }

  selectAll() {
    this.selectedEmails = [...this.emails];
  }

  deselectAll() {
    this.selectedEmails = [];
  }
}
