import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { AuthService } from 'src/app/auth/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  registerForm: FormGroup;
  messageModal: string = "";
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



   toggleLiveDemo() {
    this.visible = !this.visible;
  }

  handleLiveDemoChange(event: any) {
    this.visible = event;
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
          // Almacena el token y los datos del usuario en el almacenamiento local          
          localStorage.setItem('tokenData', JSON.stringify(tokenData));
          localStorage.setItem('token', token);
          this.spinner.hide();
          // Realiza redirección o acciones adicionales si es necesario
          this.router.navigate(['/']);
        },
        (error) => {
          // Maneja errores y muestra un mensaje al usuario
          console.error('Error al registrar usuario', error);
          this.spinner.hide();
          this.toggleLiveDemo();
          this.messageModal = 'Error al registrar usuario' + error
          // Puedes mostrar una alerta aquí
        }
      );
    } else {
      // El formulario no es válido, muestra un mensaje de error o realiza alguna acción adicional.
      console.log('El formulario no es válido. Por favor, complete los campos correctamente.');
      this.spinner.hide();
    }
  }

  validatePasswordConfirmation(control: AbstractControl): { [key: string]: any } | null {    
    
    const passwordControl = control.parent?.get('password')?.value;
    console.log(passwordControl);
    const confirmPassword = control.value;
    console.log(confirmPassword);
    return passwordControl === confirmPassword ? null : { 'passwordMismatch': true };
  }

}
