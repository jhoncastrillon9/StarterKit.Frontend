import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    // Aquí debes implementar la lógica para verificar la autenticación del usuario.
    // Por ejemplo, verifica si el usuario ha iniciado sesión o tiene un token válido.
    var usuarioAutenticado = false;
    const tokenDataString = localStorage.getItem('tokenData');

    if (tokenDataString) {
      // Validar el token aquí
      if (this.isTokenValid(tokenDataString)) {
        usuarioAutenticado = true; // El token es válido, permite el acceso a la ruta protegida.
      }
    }



    if (usuarioAutenticado) {
      return true; // Permitir el acceso a la ruta protegida.
    } else {
      // Redirigir al usuario a la página de inicio de sesión si no está autenticado.
      this.router.navigate(['/login']);
      return false;
    }
  }


  isTokenValid(tokenDataString: string): boolean {
    const tokenData = JSON.parse(tokenDataString); // Decodificar el token JWT    
    const expDate = new Date(tokenData.exp  * 1000); 
    const dateNow = new Date();
    return expDate > dateNow; // El token es válido si la fecha de expiración es posterior a la hora actual.
  }
}