import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ListProductComponent } from './list-product/list-product.component';
import { AddUpdateProductComponent } from './add-update-product/add-update-product.component';

const routes: Routes = [
  {
    path: '',
    data: {
      title: 'Productos'
    },
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'products'
      },
      {
        path: 'products',
        component: ListProductComponent,
        data: {
          title: 'Listado'
        }
      },
      {
        path: 'add',
        component: AddUpdateProductComponent,
        data: {
          title: 'Nuevo'
        }
      },
      {
        path: 'update/:id',
        component: AddUpdateProductComponent,
        data: {
          title: 'Editar'
        }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProductsRoutingModule { }
