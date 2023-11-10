import { Component, OnInit } from '@angular/core';
import { BudgetModel } from '../models/budget.Model';
import { BudgetService } from '../services/budget.service';
import { IconSetService } from '@coreui/icons-angular';
import { Router } from '@angular/router';
import { cilPencil, cilXCircle, cilZoom} from '@coreui/icons';

@Component({
  selector: 'app-list-budget',
  templateUrl: './list-budget.component.html',
  styleUrls: ['./list-budget.component.scss']
}) 
export class ListBudgetComponent implements OnInit {
  budgets: BudgetModel[] = [];
  constructor(private budgetService: BudgetService,public iconSet: IconSetService,  private router: Router) {
    iconSet.icons = {  cilPencil,cilXCircle,cilZoom };
  }


  ngOnInit() {
    this.loadBudgets();
  }

  loadBudgets(){
    this.budgetService.get().subscribe(customers => {
      this.budgets = customers;
    });
  }

  deleteBudget(customerModel: BudgetModel){
    console.log('start deleteBudget');
    console.log(customerModel);
      this.budgetService.delete(customerModel.budgetId).subscribe(
        (response: any) => {
          console.log("Budget delete is OK");      
          this.loadBudgets();           
        },
        (error) => {
          // Maneja errores y muestra un mensaje al usuario
          console.error('Error al eliminar Budget', error);
          // Puedes mostrar una alerta aquí
        }
      );

  }

  getTotal(amount:number){
    var aiu = (amount * 0.1);
    var iva = aiu * 0.19;
    var total = amount + iva;
    return total
  }


  }