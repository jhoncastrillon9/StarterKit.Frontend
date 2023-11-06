import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ListcustomerComponent } from './listcustomer/listcustomer.component';
import { AddUpdateCustomerComponent } from './add-update-customer/add-update-customer.component';
import { CustomersRoutingModule } from './customers-routing.module';
import { IconModule, IconSetService } from '@coreui/icons-angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  ButtonGroupModule,
  ButtonModule,
  CardModule,
  DropdownModule,
  FormModule,
  GridModule,
  ListGroupModule,
  SharedModule
} from '@coreui/angular';


@NgModule({
  declarations: [
    ListcustomerComponent,
    AddUpdateCustomerComponent
  ],
  imports: [
    CommonModule,
    CustomersRoutingModule,
    CommonModule,
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
  ],
  providers: [IconSetService]

})
export class CustomersModule { }
