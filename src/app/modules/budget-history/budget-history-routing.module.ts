import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ListBudgetHistoryComponent } from './list-budget-history/list-budget-history.component';

const routes: Routes = [
  {
    path: '',
    data: {
      title: 'Historial de Presupuestos'
    },
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'list'
      },
      {
        path: 'list',
        component: ListBudgetHistoryComponent,
        data: {
          title: 'Lista de Historial'
        }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BudgetHistoryRoutingModule { }
