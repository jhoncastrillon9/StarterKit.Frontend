import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddUpdateBudgetComponent } from './add-update-budget/add-update-budget.component';
import { ListBudgetComponent } from './list-budget/list-budget.component';
import { ReadBudgetComponent } from './read-budget/read-budget.component';


const routes: Routes = [
    {
      path: '',
      data: {
        title: 'Cotizaciones'
      },
      children: [
        {
          path: '',
          pathMatch: 'full',
          redirectTo: 'budgets'
        },
        {
          path: 'budgets',
          component: ListBudgetComponent,
          data: {
            title: 'Listado'
          }
        },
        {
          path: 'add',
          component: AddUpdateBudgetComponent,
          data: {
            title: 'Nueva'
          }
        },
        {
          path: 'update/:id',   
          component: AddUpdateBudgetComponent,
          data: {
            title: 'Editar'
          }
        },
        {
          path: 'read/:id',   
          component: ReadBudgetComponent,
          data: {
            title: 'Ver'
          }
        },
      ]
    }
  ];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BudgetsRoutingModule {
}
