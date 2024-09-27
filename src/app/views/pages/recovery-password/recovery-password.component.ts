import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms'; // Asegúrate de importar FormGroup y Validators desde '@angular/forms'
import { AuthService } from '../../../auth/auth.service';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-recovery-password',  
  templateUrl: './recovery-password.component.html',
  styleUrl: './recovery-password.component.scss'
})
export class RecoveryPasswordComponent {
  recoveryPasswordForm: FormGroup;
  messageModal: string = "";
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



   toggleLiveDemo() {
    this.visible = !this.visible;
  }

  handleLiveDemoChange(event: any) {
    this.visible = event;
  }

  onRecoveryPassword() {
    console.log("Start onRecoverPassword");
    if (this.recoveryPasswordForm.valid) {
      this.spinner.show();
      const formData = this.recoveryPasswordForm.value;
      this.authService.recoveryPassword(formData).subscribe(
        (response: any) => {
          console.log("onRecoverPassword is OK");
          this.spinner.hide();          
          this.router.navigate(['/login']);
        },
        (error) => {
          // Maneja errores y muestra un mensaje al usuario          
          this.spinner.hide();
          this.toggleLiveDemo();
          this.messageModal = 'Error al onRecoverPassword: ' + error.error.error
          
        }
      );
    } else {      
      this.spinner.hide();      
      Object.values(this.recoveryPasswordForm.controls).forEach(control => {
        control.markAsTouched();
      });      
    }
  }
}
