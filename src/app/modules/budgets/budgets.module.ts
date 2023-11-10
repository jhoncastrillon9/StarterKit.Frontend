import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AddUpdateBudgetComponent } from './add-update-budget/add-update-budget.component';
import { ListBudgetComponent } from './list-budget/list-budget.component';

import { BudgetsRoutingModule } from './budgets-routing.module';
import { IconModule } from '@coreui/icons-angular';
import { ButtonGroupModule, ButtonModule, CardModule, DropdownModule, FormModule, GridModule, ListGroupModule, SharedModule } from '@coreui/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ReadBudgetComponent } from './read-budget/read-budget.component';
import { NgxSpinnerModule } from 'ngx-spinner';





@NgModule({
  declarations: [
    ListBudgetComponent,
    AddUpdateBudgetComponent,
    ReadBudgetComponent
  ],
  imports: [
    CommonModule,
    BudgetsRoutingModule,
    NgxSpinnerModule,    
    CardModule,
    FormModule,
    GridModule,
    FormsModule,
    ButtonModule,
    ReactiveFormsModule,
    FormModule,
    ButtonModule,
    ButtonGroupModule,
    DropdownModule,
    SharedModule,
    ListGroupModule,
    IconModule  
  ]
})
export class BudgetsModule { }
