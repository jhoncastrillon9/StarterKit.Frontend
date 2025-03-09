import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddUpdateProjectReportComponent } from './add-update-project-report/add-update-project-report.component';
import { ListProjectReportComponent } from './list-project-report/list-project-report.component';


const routes: Routes = [
    {
      path: '',
      data: {
        title: 'Informes de obra'
      },
      children: [
        {
          path: '',
          pathMatch: 'full',
          redirectTo: 'projectreports'
        },
        {
          path: 'projectreports',
          component: ListProjectReportComponent,
          data: {
            title: 'Listado'
          }
        },
        {
          path: 'add',
          component: AddUpdateProjectReportComponent,
          data: {
            title: 'Nuevo'
          }
        },
        {
          path: 'add/:id',          
          component: AddUpdateProjectReportComponent,
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
export class ProjectReportsRoutingModule {
}
