import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ListInvoiceComponent } from './list-invoice/list-invoice.component';

const routes: Routes = [
  {
    path: '',
    data: {
      title: 'Facturacion'
    },
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'invoices'
      },
      {
        path: 'invoices',
        component: ListInvoiceComponent,
        data: {
          title: 'Listado'
        }
      },
      // Las rutas 'edit/:id' (Task 3) y 'resolution' (Task 4) se agregan en sus propias tareas.
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InvoicesRoutingModule {
}
