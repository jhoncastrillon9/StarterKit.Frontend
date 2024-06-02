import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CompanyConfigComponent } from './company-config/company-config.component';


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
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ConfigurationsRoutingModule { }
