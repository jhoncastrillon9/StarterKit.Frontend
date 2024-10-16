import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirmation-modal',
  templateUrl: './reusable-modal.component.html',
  styleUrls: ['./reusable-modal.component.scss']
})
export class ConfirmationModalComponent {
  // Controla la visibilidad del modal
  @Input() messageModal: string = '';
  @Input() title: string = '';
  @Input() alignment: string = '';
  @Input() isModalError: boolean = false;
  @Input() isConfirmation: boolean = false; // Nueva propiedad para confirmar
  @Output() confirmAction: EventEmitter<void> = new EventEmitter<void>(); // Emisor para acción de confirmación
  
  alignmentModal: 'top' | 'center' | undefined;
  visible: boolean = false;

  ngOnInit() {
    // Ajusta la alineación del modal
    if (this.alignment === 'center') {
      this.alignmentModal = 'center';
    } else {
      this.alignmentModal = 'top';
    }
  }

  // Método para cerrar el modal
  closeModal() {
    this.visible = false;
  }

  // Método para abrir el modal
  openModal() {
    this.visible = true;
  }

  // Método que se llama cuando el usuario confirma (clic en "SI")
  confirm() {
    this.confirmAction.emit(); // Emitimos el evento para que el componente padre lo maneje
    this.closeModal(); // Cerramos el modal después de confirmar
  }
}
