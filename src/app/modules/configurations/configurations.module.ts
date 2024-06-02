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
  SharedModule
} from '@coreui/angular';

@NgModule({
  declarations: [
    CompanyConfigComponent
  ],
  imports: [
    CommonModule,
    ConfigurationsRoutingModule,
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
export class ConfigurationsModule { }
