import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { AuthService } from 'src/app/auth/auth.service';
import { ValidateCodeModel } from '../models/validateCode.Model.ts';

@Component({
  selector: 'app-change-password',  
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.scss'
})


export class ChangePasswordComponent {
  registerForm: FormGroup;
  messageModal: string = "";
  public visible = false;
  validateCodeModel = new ValidateCodeModel()



  constructor(private fb: FormBuilder, 
    private authService: AuthService, 
    private router: Router,
    private route: ActivatedRoute,
    private spinner: NgxSpinnerService
  ) {
    this.registerForm = fb.group({     
      password: ['', [Validators.required]],      
      passwordconfirmation: ['', [Validators.required, this.validatePasswordConfirmation.bind(this)]], // Aplicando la función de validación personalizada      
    });
   }

   ngOnInit() {
    this.route.paramMap.subscribe(params => {      
      this.validateCodeModel.codePassword = params.get('id')!;
      console.log("try get parameter" + this.validateCodeModel.codePassword);
    })
    }



   toggleLiveDemo() {
    this.visible = !this.visible;
  }

  handleLiveDemoChange(event: any) {
    this.visible = event;
  }

   onChangePassword() {
    console.log("Start onChangePassword");
    if (this.registerForm.valid) {
      this.spinner.show();
      const formData = this.registerForm.value;
      this.validateCodeModel.newPassword = this.registerForm.get('password')?.value
      this.authService.changePassword(this.validateCodeModel).subscribe(
        (response: any) => {
          console.log("onChangePassword is OK");
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
          this.messageModal = 'Error al cambiar contraseña, intentalo de nuevo o el link venció'
          
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
