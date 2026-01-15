import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ProfileRoutingModule } from './profile-routing.module';
import { ProfileComponent } from './profile/profile.component';
import { IconModule, IconSetService } from '@coreui/icons-angular';
import {
  AlertModule,
  ButtonGroupModule,
  ButtonModule,
  CardModule,
  FormModule,
  GridModule,
  ListGroupModule,
  ModalModule,
  SharedModule
} from '@coreui/angular';
import { NgxSpinnerModule } from 'ngx-spinner';

@NgModule({
  declarations: [
    ProfileComponent
  ],
  imports: [
    CommonModule,
    ProfileRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    NgxSpinnerModule,
    CardModule,
    FormModule,
    GridModule,
    ButtonModule,
    ButtonGroupModule,
    SharedModule,
    ListGroupModule,
    IconModule,
    ModalModule,
    AlertModule
  ],
  providers: [IconSetService]
})
export class ProfileModule { }
