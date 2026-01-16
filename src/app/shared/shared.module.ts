import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmationModalComponent } from './components/reusable-modal/reusable-modal.component';
import { EmailSelectorModalComponent } from './components/email-selector-modal/email-selector-modal.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'; // Si usas ngModel
import { ButtonGroupModule, ButtonModule, CardModule, DropdownModule, FormModule, GridModule, ListGroupModule, ModalModule, SharedModule } from '@coreui/angular';
import { IconModule } from '@coreui/icons-angular';
import { ThousandSeparatorDirective } from './directives/thousand-separator.directive';
import { ChipModule } from 'primeng/chip';
import { SharedModule as PipesSharedModule } from '../shared.module';

@NgModule({
  declarations: [
    ConfirmationModalComponent,
    EmailSelectorModalComponent,
    ThousandSeparatorDirective
  ],
  imports: [
    CommonModule,
    FormsModule,
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
    ChipModule, // Para p-chip en el selector de emails
    PipesSharedModule
  ],
  exports: [
    ConfirmationModalComponent,
    EmailSelectorModalComponent,
    ThousandSeparatorDirective,
    PipesSharedModule
  ] // Exportamos para que otros módulos lo usen
})
export class CustomSharedModule { }