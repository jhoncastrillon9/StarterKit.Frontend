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
  @Input() isModalError: Boolean = false;
  
  alignmentModal: 'top'| 'center'| undefined;
  visible: boolean = false;


  ngOnInit() {    
    if (this.alignment === 'center') { 
      this.alignmentModal = 'center';
    } else {
      this.alignmentModal = 'top'; // Por ejemplo, puedes poner 'top' si no es 'center'
    }
  }
  // Método para cerrar el modal y emitir el cambio
  closeModal() {
    this.visible = false;  
  }

  // Método para abrir el modal (si es necesario)
  openModal() {
    this.visible = true;
  }
}

