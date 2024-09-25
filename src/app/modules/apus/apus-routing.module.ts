import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {ListApuComponent} from './list-apu/list-apu.component';


const routes: Routes = [
    {
      path: '',
      data: {
        title: 'Apu'
      },
      children: [
        {
          path: '',
          pathMatch: 'full',
          redirectTo: 'apus'
        },
        {
          path: 'apus',
          component: ListApuComponent,
          data: {
            title: 'Analisis de precios unitarios'
          }
        }
      ]
    }
  ];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ApusRoutingModule {
}
