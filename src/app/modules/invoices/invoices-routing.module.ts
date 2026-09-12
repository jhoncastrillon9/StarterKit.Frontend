import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ListInvoiceComponent } from './list-invoice/list-invoice.component';
import { EditInvoiceComponent } from './edit-invoice/edit-invoice.component';
import { InvoiceResolutionComponent } from './invoice-resolution/invoice-resolution.component';

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
      {
        path: 'edit/:id',
        component: EditInvoiceComponent,
        data: {
          title: 'Editar factura'
        }
      },
      {
        path: 'resolution',
        component: InvoiceResolutionComponent,
        data: {
          title: 'Resolucion de facturacion'
        }
      },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InvoicesRoutingModule {
}
