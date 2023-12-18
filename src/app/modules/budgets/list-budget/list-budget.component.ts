import { Component, OnInit } from '@angular/core';
import { BudgetModel } from '../models/budget.Model';
import { BudgetService } from '../services/budget.service';
import { IconSetService } from '@coreui/icons-angular';
import { Router } from '@angular/router';
import { cilPencil, cilXCircle, cilZoom, cilCloudDownload} from '@coreui/icons';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-list-budget',
  templateUrl: './list-budget.component.html',
  styleUrls: ['./list-budget.component.scss']
}) 
export class ListBudgetComponent implements OnInit {
  budgets: BudgetModel[] = [];
  constructor(private budgetService: BudgetService,
    public iconSet: IconSetService,  
    private router: Router,
    private spinner: NgxSpinnerService) {
    iconSet.icons = {  cilPencil,cilXCircle,cilZoom, cilCloudDownload};
  }


  ngOnInit() {
    this.loadBudgets();
  }

  loadBudgets(){
    this.spinner.show()    
    this.budgetService.get().subscribe(customers => {
      this.budgets = customers;
      this.spinner.hide();
    },(error)=>{
      console.error('Error al cargar Budget', error);
      this.spinner.hide();
    });
  }

  deleteBudget(customerModel: BudgetModel){    
    this.spinner.show()    
      this.budgetService.delete(customerModel.budgetId).subscribe(
        (response: any) => {
          console.log("Budget delete is OK");      
          this.loadBudgets();           
          this.spinner.hide();
        },
        (error) => {
          // Maneja errores y muestra un mensaje al usuario
          console.error('Error al eliminar Budget', error);
          // Puedes mostrar una alerta aquí
          this.spinner.hide();
        }
      );
  }


  downloadBudget(customerModel: BudgetModel) {
    this.spinner.show();

    this.budgetService.download(customerModel.budgetId).subscribe(
      (data: Blob) => {
        console.log("Descarga de Budget exitosa");
        this.descargarPDF(data,customerModel);
        this.spinner.hide();
      },
      (error) => {
        // Maneja errores y muestra un mensaje al usuario
        console.error('Error al descargar Budget', error);
        // Puedes mostrar una alerta aquí
        this.spinner.hide(); // Asegúrate de ocultar el spinner en caso de error
      }
    );
  }

  private descargarPDF(data: Blob, customerModel: BudgetModel) {
    const url = window.URL.createObjectURL(data);    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Cotizacion_'+customerModel.budgetId;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }





  getTotal(amount:number){
    var aiu = (amount * 0.1);
    var iva = aiu * 0.19;
    var total = amount + iva;
    return total
  }


  }