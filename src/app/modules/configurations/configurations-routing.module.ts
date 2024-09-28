import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CompanyConfigComponent } from './company-config/company-config.component';
import { BudgetConfigComponent } from './budget-config/budget-config.component';



const routes: Routes = [
  {
    path: '',
    data: {
      title: 'Configuraciones'
    },
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'configurations'
      },
      {
        path: 'configurations',
        component: CompanyConfigComponent,
        data: {
          title: 'Empresa'
        }
      },
      {
        path: 'companyConfig',
        component: CompanyConfigComponent,
        data: {
          title: 'Empresa'
        }
      },
      {
        path: 'budgetConfig',
        component: BudgetConfigComponent,
        data: {
          title: 'Cotizaciones'
        }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ConfigurationsRoutingModule { }
