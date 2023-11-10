import { Component, ElementRef, ViewChild, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import html2canvas from 'html2canvas';
import {jsPDF} from 'jspdf';import { BudgetService } from '../services/budget.service';
import { BudgetDetailModel, BudgetModel } from '../models/budget.Model';
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


  //Campos calculados
  amount: number = 0;  
  aiu: number = 0;
  iva: number = 0;
  total: number = 0;
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
          this.setCalculatesTotals(this.budgetDto);
        });
      } else {
        console.log("test ReadBudgetDetail");        
      }
    });
    
  }

  setCalculatesTotals(budgetDto: any) {
    this.amount = budgetDto.amount;
    this.aiu = this.amount * 0.1; // Calculas el AIU
    this.iva = this.aiu * 0.19; // Calculas el IVA
    this.total = this.amount + this.iva; // Calculas el total
}

getSubtotalDetail(budgetDetailsDto:BudgetDetailModel){
return budgetDetailsDto.quantity*budgetDetailsDto.price;
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
