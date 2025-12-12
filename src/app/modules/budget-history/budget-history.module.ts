import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BudgetHistoryRoutingModule } from './budget-history-routing.module';
import { ListBudgetHistoryComponent } from './list-budget-history/list-budget-history.component';
import { IconModule } from '@coreui/icons-angular';
import { NgxSpinnerModule } from 'ngx-spinner';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule as PrimeButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { CustomSharedModule } from '../../shared/shared.module';

import {
  AlertModule,
  BadgeModule,
  ButtonModule,
  CardModule,
  FormModule,
  GridModule,
  ModalModule,
  SharedModule,
  TooltipModule
} from '@coreui/angular';

@NgModule({
  declarations: [
    ListBudgetHistoryComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    BudgetHistoryRoutingModule,
    CustomSharedModule,
    NgxSpinnerModule,
    IconModule,
    TableModule,
    InputTextModule,
    PrimeButtonModule,
    CalendarModule,
    CardModule,
    FormModule,
    GridModule,
    ButtonModule,
    SharedModule,
    ModalModule,
    BadgeModule,
    AlertModule,
    TooltipModule
  ]
})
export class BudgetHistoryModule { }
