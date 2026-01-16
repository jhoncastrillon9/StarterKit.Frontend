import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DefaultLayoutComponent } from './containers';
import { Page404Component } from './views/pages/page404/page404.component';
import { Page500Component } from './views/pages/page500/page500.component';
import { LoginComponent } from './views/pages/login/login.component';
import { RegisterComponent } from './views/pages/register/register.component';
import {AuthGuard} from './auth.guard'
import { RecoveryPasswordComponent } from './views/pages/recovery-password/recovery-password.component';
import { LoginCodeComponent } from './views/pages/login-code/login-code.component';
import { ChangePasswordComponent } from './views/pages/change-password/change-password.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: '',
    component: DefaultLayoutComponent,
    data: {
      title: 'Inicio'
    },
    children: [
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./views/dashboard/dashboard.module').then((m) => m.DashboardModule),
          canActivate: [AuthGuard]
      },
      {
        path: 'budgets',
        loadChildren: () =>
          import('./modules/budgets/budgets.module').then((m) => m.BudgetsModule),          
          canActivate: [AuthGuard]
      },
      {
        path: 'budgetHistory',
        loadChildren: () =>
          import('./modules/budget-history/budget-history.module').then((m) => m.BudgetHistoryModule),          
          canActivate: [AuthGuard]
      },
      {
        path: 'apus',
        loadChildren: () =>
          import('./modules/apus/apus-routing.module').then((m) => m.ApusRoutingModule),          
          canActivate: [AuthGuard]
      },
      {
        path: 'configurations',
        loadChildren: () =>
          import('./modules/configurations/configurations.module').then((m) => m.ConfigurationsModule),          
          canActivate: [AuthGuard]
      },
      {
        path: 'payments',
        loadChildren: () =>
          import('./modules/payments/payments.module').then((m) => m.PaymentsModule),          
          canActivate: [AuthGuard]
      },
      {
        path: 'customers',
        loadChildren: () =>
          import('./modules/customers/customers.module').then((m) => m.CustomersModule),          
          canActivate: [AuthGuard]
      },
      {
        path: 'products',
        loadChildren: () =>
          import('./modules/products/products.module').then((m) => m.ProductsModule),          
          canActivate: [AuthGuard]
      },
      {
        path: 'projectreports',
        loadChildren: () =>
          import('./modules/project-reports/ProjectReports-routing.module').then((m) => m.ProjectReportsRoutingModule),          
          canActivate: [AuthGuard]
      },
      {
        path: 'theme',
        loadChildren: () =>
          import('./views/theme/theme.module').then((m) => m.ThemeModule),          
          canActivate: [AuthGuard]
      },
      {
        path: 'base',
        loadChildren: () =>
          import('./views/base/base.module').then((m) => m.BaseModule),
          canActivate: [AuthGuard]
      },
      {
        path: 'buttons',
        loadChildren: () =>
          import('./views/buttons/buttons.module').then((m) => m.ButtonsModule),
          canActivate: [AuthGuard]
      },
      {
        path: 'forms',
        loadChildren: () =>
          import('./views/forms/forms.module').then((m) => m.CoreUIFormsModule),
          canActivate: [AuthGuard]
      },
      {
        path: 'charts',
        loadChildren: () =>
          import('./views/charts/charts.module').then((m) => m.ChartsModule),
          canActivate: [AuthGuard]
      },
      {
        path: 'icons',
        loadChildren: () =>
          import('./views/icons/icons.module').then((m) => m.IconsModule),
          canActivate: [AuthGuard]
      },
      {
        path: 'notifications',
        loadChildren: () =>
          import('./views/notifications/notifications.module').then((m) => m.NotificationsModule),
          canActivate: [AuthGuard]
      },
      {
        path: 'widgets',
        loadChildren: () =>
          import('./views/widgets/widgets.module').then((m) => m.WidgetsModule),
          canActivate: [AuthGuard]
      },
      {
        path: 'pages',
        loadChildren: () =>
          import('./views/pages/pages.module').then((m) => m.PagesModule),
          canActivate: [AuthGuard]
      },
      {
        path: 'reports',
        loadChildren: () => import('./modules/reports/reports.module').then(m => m.ReportsModule),
        canActivate: [AuthGuard]
      },
      {
        path: 'profile',
        loadChildren: () => import('./modules/profile/profile.module').then(m => m.ProfileModule),
        canActivate: [AuthGuard]
      },
    ]
  },
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
    path: 'recoveryPassword',
    component: RecoveryPasswordComponent,
    data: {
      title: 'Recover Password Page'
    }
  },
  {
    path: 'loginCode/:id',
    component: LoginCodeComponent,
    data: {
      title: 'Recover Password Page'
    }
  },
  {
    path: 'changepassword/:id',
    component: ChangePasswordComponent,
    data: {
      title: 'changepassword Page'
    }
  },
  {path: '**', redirectTo: 'dashboard'}
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      scrollPositionRestoration: 'top',
      anchorScrolling: 'enabled',
      initialNavigation: 'enabledBlocking'
      // relativeLinkResolution: 'legacy'
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
