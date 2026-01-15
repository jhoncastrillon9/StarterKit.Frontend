import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProfileComponent } from './profile/profile.component';

const routes: Routes = [
  {
    path: '',
    data: {
      title: 'Perfil'
    },
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'me'
      },
      {
        path: 'me',
        component: ProfileComponent,
        data: {
          title: 'Mi Perfil'
        }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProfileRoutingModule { }
