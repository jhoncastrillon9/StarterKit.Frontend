import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { CurrentUserService } from 'src/app/shared/services/current-user.service';

/**
 * Deja entrar al panel de plataforma solo a un SuperAdmin.
 *
 * Esto es comodidad, NO seguridad: el token esta en el navegador y se puede
 * manipular. Quien protege de verdad es el backend, que comprueba el rol en el
 * controlador y otra vez dentro del servicio. Si alguien se salta este guard,
 * la API le responde 403 y no ve un solo dato.
 */
@Injectable({ providedIn: 'root' })
export class SuperAdminGuard implements CanActivate {
  constructor(private currentUser: CurrentUserService, private router: Router) {}

  canActivate(): boolean {
    if (this.currentUser.isSuperAdmin) return true;
    this.router.navigate(['/dashboard']);
    return false;
  }
}
