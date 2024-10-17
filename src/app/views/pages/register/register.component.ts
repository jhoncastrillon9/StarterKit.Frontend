import { Component, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { AuthService } from 'src/app/auth/auth.service';
import { ConfirmationModalComponent } from 'src/app/shared/components/reusable-modal/reusable-modal.component';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  @ViewChild('confirmationModal') confirmationModal!: ConfirmationModalComponent;
  isModalError: boolean = false;  
  messageModal: string = "Estamos teniendo algunos inconvenientes. Por favor, inténtalo de nuevo más tarde. Si necesitas agregar un usuario a una empresa existente, contacta con nuestro equipo de soporte.";
  title: string = "¡Ups! Algo salió mal";
  registerForm: FormGroup;  
  public visible = false;


  constructor(private fb: FormBuilder, 
    private authService: AuthService, 
    private router: Router,
    private spinner: NgxSpinnerService
  ) {
    this.registerForm = fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],      
      passwordconfirmation: ['', [Validators.required, this.validatePasswordConfirmation.bind(this)]], // Aplicando la función de validación personalizada
      companyName: ['', [Validators.required]],
    });
   }



   onRegister() {
    console.log("Start register");
    if (this.registerForm.valid) {
      this.spinner.show();
      const formData = this.registerForm.value;
      this.authService.register(formData).subscribe(
        (response: any) => {
          console.log("register is OK");
          const { token  } = response;          
          const tokenData = JSON.parse(atob(token.split('.')[1]));                     
          localStorage.setItem('tokenData', JSON.stringify(tokenData));
          localStorage.setItem('token', token);
          this.spinner.hide();          
          this.router.navigate(['/configurations/companyConfig']);
        },
        (error) => {
          // Maneja errores y muestra un mensaje al usuario          
          this.spinner.hide();
          if (error.status === 400) {
            this.handleError('Error register', error.error.error)
          } else {
            this.handleError('Error register', this.messageModal)
          }  
        }
      );
    } else {      
      this.spinner.hide();      
      Object.values(this.registerForm.controls).forEach(control => {
        control.markAsTouched();
      });      
    }
  }

  validatePasswordConfirmation(control: AbstractControl): { [key: string]: any } | null {    
    
    const passwordControl = control.parent?.get('password')?.value;    
    const confirmPassword = control.value;    
    return passwordControl === confirmPassword ? null : { 'passwordMismatch': true };
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
