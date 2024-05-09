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
          localStorage.setItem('tokenData', JSON.stringify(tokenData));
          localStorage.setItem('token', token);
          this.spinner.hide();          
          this.router.navigate(['/']);
        },
        (error) => {
          // Maneja errores y muestra un mensaje al usuario          
          this.spinner.hide();
          this.toggleLiveDemo();
          this.messageModal = 'Error al registrar usuario: ' + error.error.error
          
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

}
