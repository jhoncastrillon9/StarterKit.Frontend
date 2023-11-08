import { Component, ElementRef, ViewChild, OnInit } from '@angular/core';
import {jsPDF} from 'jspdf';;

@Component({
  selector: 'app-read-budget',
  templateUrl: './read-budget.component.html',
  styleUrls: ['./read-budget.component.scss']
})
export class ReadBudgetComponent {
  @ViewChild('content', { static: false }) content!: ElementRef;

  generatePDF() {
    const doc = new jsPDF();

    // Obtener el contenido HTML de la plantilla
    const content = this.content.nativeElement;

    
    doc.html(content.innerHTML, {
      callback: function (pdf) {
        pdf.save('factura.pdf');
      }
    });

    
  }
}
