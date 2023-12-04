import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms'; // Asegúrate de importar FormGroup y Validators desde '@angular/forms'
import { AuthService } from '../../../auth/auth.service';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';


@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginForm: FormGroup;
  messageModal: string = "";
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




  toggleLiveDemo() {
    this.visible = !this.visible;
  }

  handleLiveDemoChange(event: any) {
    this.visible = event;
  }

  onLogin() {
    console.log("Start login");
    if (this.loginForm.valid) {
      this.spinner.show();
      const formData = this.loginForm.value;
      this.authService.login(formData).subscribe(
        (response: any) => {
          console.log("login is OK");
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
          console.error('Error al iniciar sesión', error);
          this.spinner.hide();
          this.toggleLiveDemo();
          this.messageModal = 'Error al iniciar sesión' + error
          // Puedes mostrar una alerta aquí
        }
      );
    } else {
      // El formulario no es válido, muestra un mensaje de error o realiza alguna acción adicional.
      console.log('El formulario no es válido. Por favor, complete los campos correctamente.');
      this.spinner.hide();
    }
  }
}