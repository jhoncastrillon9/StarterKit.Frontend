import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ListPaymentComponent } from './list-payment/list-payment.component';
import { AddUpdateComponent } from './add-update/add-update.component';


const routes: Routes = [
  {
    path: '',
    data: {
      title: 'Pagos'
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
      },
      {
        path: 'add/:budgetId',
        component: AddUpdateComponent,
        data: {
          title: 'Nuevo'
        }
      },
      {
        path: 'update/:id',          
        component: AddUpdateComponent,
        data: {
          title: 'Editar'
        }
      },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PaymentsRoutingModule { }
