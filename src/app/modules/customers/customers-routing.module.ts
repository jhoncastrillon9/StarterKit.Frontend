import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddUpdateCustomerComponent } from './add-update-customer/add-update-customer.component';
import { ListcustomerComponent } from './listcustomer/listcustomer.component';


const routes: Routes = [
    {
      path: '',
      data: {
        title: 'Clientes'
      },
      children: [
        {
          path: '',
          pathMatch: 'full',
          redirectTo: 'customers'
        },
        {
          path: 'customers',
          component: ListcustomerComponent,
          data: {
            title: 'Listado'
          }
        },
        {
          path: 'add',
          component: AddUpdateCustomerComponent,
          data: {
            title: 'Nuevo'
          }
        },
        {
          path: 'update/:id',          
          component: AddUpdateCustomerComponent,
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
export class CustomersRoutingModule {
}
