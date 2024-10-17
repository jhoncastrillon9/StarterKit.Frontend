import { Component, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms'; // Asegúrate de importar FormGroup y Validators desde '@angular/forms'
import { AuthService } from '../../../auth/auth.service';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { ConfirmationModalComponent } from 'src/app/shared/components/reusable-modal/reusable-modal.component';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  @ViewChild('confirmationModal') confirmationModal!: ConfirmationModalComponent;
  isModalError: boolean = false;
  loginForm: FormGroup;
  messageModal: string = "Parece que el usuario o la contraseña que has ingresado son incorrectos. A veces, hasta los teclados se confunden.";
  title: string = "¡Ups! Algo salió mal";

  public visible = false;
  
  constructor(private fb: FormBuilder, 
    private authService: AuthService, 
    private router: Router,
    private spinner: NgxSpinnerService) {
    this.loginForm = fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
  }


  onLogin() {
    if (this.loginForm.valid) {
      this.spinner.show();
      const formData = this.loginForm.value;
      this.authService.login(formData).subscribe(
        (response: any) => {
          const { token  } = response;          
          const tokenData = JSON.parse(atob(token.split('.')[1]));           
          // Almacena el token y los datos del usuario en el almacenamiento local          
          localStorage.setItem('tokenData', JSON.stringify(tokenData));
          localStorage.setItem('token', token);
          this.spinner.hide();
          // Realiza redirección o acciones adicionales si es necesario
          this.router.navigate(['/']);
        },
        (error) => {
          // Maneja errores y muestra un mensaje al usuario          
          this.spinner.hide();
          if (error.status === 401) {
            this.handleError('Error Login',this.messageModal);
          } else {
            this.handleError('Error Login', 'Estamos experimentando problemas. Por favor, intenta más tarde.');
          }    
          console.log(error.error);   
        }
      );
    } else {
      // El formulario no es válido, muestra un mensaje de error o realiza alguna acción adicional.      
      this.spinner.hide();
      Object.values(this.loginForm.controls).forEach(control => {
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