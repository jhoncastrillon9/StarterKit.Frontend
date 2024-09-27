import { Component } from '@angular/core';
import { AuthService } from '../../../auth/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import {ValidateCodeModel} from '../models/validateCode.Model.ts';


@Component({
  selector: 'app-login-code',
  templateUrl: './login-code.component.html',
  styleUrl: './login-code.component.scss'
})

export class LoginCodeComponent {
  validateCodeModel = new ValidateCodeModel()
  
  messageModal: string = "";
  public visible = false;
  
  constructor( 
    private authService: AuthService, 
    private router: Router,
    private route: ActivatedRoute,
    private spinner: NgxSpinnerService) {

  }

 


  toggleLiveDemo() {
    this.visible = !this.visible;
  }

  handleLiveDemoChange(event: any) {
    this.visible = event;
  }
  ngOnInit() {
    this.route.paramMap.subscribe(params => {      
      this.validateCodeModel.codePassword = params.get('id')!;
      console.log("try get parameter" + this.validateCodeModel.codePassword);
      this.spinner.show();
      this.authService.validateCodePasword(this.validateCodeModel).subscribe(
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
          this.spinner.hide();
          this.toggleLiveDemo();
          this.messageModal = 'Error al iniciar sesión: ' + error.error.error
          // Puedes mostrar una alerta aquí
          this.router.navigate(['/']);
        }
      );    
    });

    this.spinner.hide();
  }
  
 
}