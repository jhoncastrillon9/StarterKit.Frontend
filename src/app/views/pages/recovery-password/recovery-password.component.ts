import { Component, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms'; // Asegúrate de importar FormGroup y Validators desde '@angular/forms'
import { AuthService } from '../../../auth/auth.service';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { ConfirmationModalComponent } from 'src/app/shared/components/reusable-modal/reusable-modal.component';

@Component({
  selector: 'app-recovery-password',  
  templateUrl: './recovery-password.component.html',
  styleUrl: './recovery-password.component.scss'
})
export class RecoveryPasswordComponent {
  @ViewChild('confirmationModal') confirmationModal!: ConfirmationModalComponent;
  isModalError: boolean = false;  
  messageModal: string = "Estamos teniendo algunos inconvenientes. Por favor, inténtalo de nuevo más tarde. Si necesitas agregar un usuario a una empresa existente, contacta con nuestro equipo de soporte.";
  title: string = "¡Ups! Algo salió mal";
  recoveryPasswordForm: FormGroup;
  public visible = false;


  constructor(private fb: FormBuilder, 
    private authService: AuthService, 
    private router: Router,
    private spinner: NgxSpinnerService
  ) {
    this.recoveryPasswordForm = fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
   }


  onRecoveryPassword() {
    if (this.recoveryPasswordForm.valid) {
      this.spinner.show();
      const formData = this.recoveryPasswordForm.value;
      this.authService.recoveryPassword(formData).subscribe(
        (response: any) => {   
          this.spinner.hide();          
          this.router.navigate(['/login']);
        },
        (error) => {         
          this.spinner.hide();
          if (error.status === 400) {
            this.handleError('Error recovery', error.error.error)
          } else {
            this.handleError('Error recovery', this.messageModal)
          } 
    
          this.messageModal = 'Error al onRecoverPassword: ' + error.error.error;          
        }
      );
    } else {      
      this.spinner.hide();      
      Object.values(this.recoveryPasswordForm.controls).forEach(control => {
        control.markAsTouched();
      });      
    }
  }


  private handleError(consoleMessage: string, modalMessage: string) {
    console.error(consoleMessage);
    this.showModal(true, modalMessage, this.title);
  }

  showModal(isError: boolean, message: string, title: string) {
    this.confirmationModal.isModalError = isError;
    this.confirmationModal.title = title;
    this.confirmationModal.messageModal = message;
    this.confirmationModal.isConfirmation = false;
    this.confirmationModal.openModal();
  }



}
