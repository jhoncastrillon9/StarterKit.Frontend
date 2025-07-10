import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportsRoutingModule } from './reports-routing.module';
import { AccountStatementComponent } from './account-statement/account-statement.component';
import { FormsModule } from '@angular/forms';
import { GridModule, BadgeModule } from '@coreui/angular';
import { NgxSpinnerModule } from 'ngx-spinner';

@NgModule({
  declarations: [AccountStatementComponent],
  imports: [
    CommonModule,
    ReportsRoutingModule,
    FormsModule,
    GridModule,
    BadgeModule,
    NgxSpinnerModule
  ]
})
export class ReportsModule { } 