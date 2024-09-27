import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Page404Component } from './page404/page404.component';
import { Page500Component } from './page500/page500.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { RecoveryPasswordComponent } from './recovery-password/recovery-password.component';
import { LoginCodeComponent } from './login-code/login-code.component';
import { ChangePasswordComponent } from './change-password/change-password.component';


const routes: Routes = [
  {
    path: '404',
    component: Page404Component,
    data: {
      title: 'Page 404'
    }
  },
  {
    path: '500',
    component: Page500Component,
    data: {
      title: 'Page 500'
    }
  },
  {
    path: 'login',
    component: LoginComponent,
    data: {
      title: 'Login Page'
    }
  },
  {
    path: 'register',
    component: RegisterComponent,
    data: {
      title: 'Register Page'
    }    
  },
  {
    path: 'recovery',
    component: RecoveryPasswordComponent,
    data: {
      title: 'recovery Password Page'
    },       
  },
  {
    path: 'loginCode/:id',
    component: LoginCodeComponent,
    data: {
      title: 'loginCode Page'
    },       
  },
  {
    path: 'changepassword/:id',
    component: ChangePasswordComponent,
    data: {
      title: 'ChangePassword Page'
    },       
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PagesRoutingModule {
}
