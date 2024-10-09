import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigurationsRoutingModule } from './configurations-routing.module';
import { CompanyConfigComponent } from './company-config/company-config.component';
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
  ModalModule,
  SharedModule
} from '@coreui/angular';
import { NgxSpinnerModule } from 'ngx-spinner';
import { BudgetConfigComponent } from './budget-config/budget-config.component';

@NgModule({
  declarations: [
    CompanyConfigComponent,
    BudgetConfigComponent
  ],
  imports: [
    CommonModule,
    ConfigurationsRoutingModule,
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
  ],
  providers: [IconSetService]
})
export class ConfigurationsModule { }
