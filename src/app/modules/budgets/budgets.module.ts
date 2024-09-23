import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AddUpdateBudgetComponent } from './add-update-budget/add-update-budget.component';
import { ListBudgetComponent } from './list-budget/list-budget.component';
import { BudgetsRoutingModule } from './budgets-routing.module';
import { IconModule } from '@coreui/icons-angular';
import { ButtonGroupModule, ButtonModule, CardModule, DropdownModule, FormModule, GridModule, ListGroupModule, ModalModule, SharedModule } from '@coreui/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ReadBudgetComponent } from './read-budget/read-budget.component';
import { NgxSpinnerModule } from 'ngx-spinner';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule as PrimeButtonModule }  from 'primeng/button';


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
    IconModule,
    ModalModule,
    
    ]
})
export class BudgetsModule { }
