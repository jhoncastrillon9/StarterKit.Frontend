import { Component, ElementRef, ViewChild, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import html2canvas from 'html2canvas';
import {jsPDF} from 'jspdf';import { BudgetService } from '../services/budget.service';
import { BudgetModel } from '../models/budget.Model';
;

@Component({
  selector: 'app-read-budget',
  templateUrl: './read-budget.component.html',
  styleUrls: ['./read-budget.component.scss']
})
export class ReadBudgetComponent  implements OnInit{
  @ViewChild('content', { static: false }) content!: ElementRef;
  budgetId?: string;
  budgetDto? : BudgetModel

  constructor(
    
    private router: Router,
    private route: ActivatedRoute,
    private budgetService: BudgetService,
  ) {
    
  }


  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.budgetId = params.get('id')!;
  
      if (this.budgetId) {
        this.budgetService.getById(this.budgetId).subscribe((budget: any) => {
          this.budgetDto = Object.assign(new BudgetModel(), budget);
          console.log(this.budgetDto);
          

        });
      } else {
        console.log("test ReadBudgetDetail");        
      }
    });
    
  }


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
