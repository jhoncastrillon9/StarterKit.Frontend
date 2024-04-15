import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ListPaymentComponent } from './list-payment/list-payment.component';


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
        redirectTo: 'payments'
      },
      {
        path: 'payments',
        component: ListPaymentComponent,
        data: {
          title: 'Listado'
        }
      }

    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PaymentsRoutingModule { }
