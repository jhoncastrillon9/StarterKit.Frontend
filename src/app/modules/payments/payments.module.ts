import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PaymentsRoutingModule } from './payments-routing.module';
import { ListPaymentComponent } from '../payments/list-payment/list-payment.component';
import { NgxSpinnerModule } from 'ngx-spinner';
import { ButtonGroupModule, ButtonModule, CardModule, DropdownModule, FormModule, GridModule, ListGroupModule, ModalModule, SharedModule } from '@coreui/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IconModule } from '@coreui/icons-angular';
import { AddUpdateComponent } from './add-update/add-update.component';



@NgModule({
  declarations: [
    ListPaymentComponent,
    AddUpdateComponent
  ],
  imports: [
    CommonModule,
    PaymentsRoutingModule,
    CommonModule,    
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
    ModalModule
  ]
})
export class PaymentsModule { }
