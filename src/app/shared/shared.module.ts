import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmationModalComponent } from './components/reusable-modal/reusable-modal.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'; // Si usas ngModel
import { ButtonGroupModule, ButtonModule, CardModule, DropdownModule, FormModule, GridModule, ListGroupModule, ModalModule, SharedModule } from '@coreui/angular';
import { IconModule } from '@coreui/icons-angular';
import { ThousandSeparatorDirective } from './directives/thousand-separator.directive';

@NgModule({
  declarations: [
    ConfirmationModalComponent,
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
    ModalModule, // Si necesitas usar ngModel para manejar el modal
  ],
  exports: [
    ConfirmationModalComponent,
    ThousandSeparatorDirective
  ] // Exportamos para que otros módulos lo usen
})
export class CustomSharedModule { }