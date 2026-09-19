import { Component, Input, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';

import { ClassToggleService, HeaderComponent } from '@coreui/angular';
import { Subscription } from 'rxjs';
import { ProfileService } from 'src/app/modules/profile/services/profile.service';

@Component({
  selector: 'app-default-header',
  templateUrl: './default-header.component.html',
  styleUrls: ['./default-header.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class DefaultHeaderComponent extends HeaderComponent implements OnInit, OnDestroy {

  @Input() sidebarId: string = "sidebar";

  public newMessages = new Array(4)
  public newTasks = new Array(5)
  public newNotifications = new Array(5)

  public userEmail?: string;

  /** Avatar generico cuando el usuario no ha subido fotografia. */
  readonly defaultAvatar = './assets/img/avatars/3d_1.png';

  /** Fotografia mostrada en la barra. Antes estaba fija en la plantilla. */
  avatarSrc: string = this.defaultAvatar;

  private photoSub?: Subscription;

  constructor(private classToggler: ClassToggleService,
    private router: Router,
    private profileService: ProfileService,
  ) {
    super();
  }

  ngOnInit() {
    const tokenDataString = localStorage.getItem('tokenData');
    if (tokenDataString) {
      const tokenData = JSON.parse(tokenDataString);
      this.userEmail = tokenData.Email;
    }

    // La barra se pinta una vez por sesion, asi que se suscribe: si el usuario
    // cambia su foto desde el perfil, esta se entera sin recargar la pagina.
    this.photoSub = this.profileService.photo$.subscribe(url => {
      this.avatarSrc = url || this.defaultAvatar;
    });

    // El token no lleva la fotografia; hay que pedirsela al backend.
    this.profileService.getMyProfile().subscribe({
      next: () => { /* el servicio publica la foto por photo$ */ },
      error: () => { /* se queda el avatar por defecto */ }
    });
  }

  ngOnDestroy(): void {
    this.photoSub?.unsubscribe();
  }

  signoff() {
    // Limpiar datos de usuario en el almacenamiento local
    localStorage.removeItem('tokenData');
    // Redirigir a la página de inicio de sesión
    this.router.navigate(['/login']);    
  }



}
