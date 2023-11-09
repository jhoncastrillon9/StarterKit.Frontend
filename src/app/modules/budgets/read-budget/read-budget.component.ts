import { Component, ElementRef, ViewChild, OnInit } from '@angular/core';
import html2canvas from 'html2canvas';
import {jsPDF} from 'jspdf';;

@Component({
  selector: 'app-read-budget',
  templateUrl: './read-budget.component.html',
  styleUrls: ['./read-budget.component.scss']
})
export class ReadBudgetComponent {
  @ViewChild('content', { static: false }) content!: ElementRef;

  generatePDF() {
    const content = this.content.nativeElement;

    html2canvas(content, {
      allowTaint: true,
      useCORS: true,
      scale: 5 // Ajusta la escala según sea necesario
    }).then(function (canvas) {
      var img = canvas.toDataURL("image/png");
      var doc = new jsPDF();
      doc.addImage(img, 'PNG', 0, 0, 210, 297);
      doc.save('factura.pdf');
    });
  }
}
