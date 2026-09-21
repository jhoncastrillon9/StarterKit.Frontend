import { Injectable } from '@angular/core';

/** Claim de rol que emite el backend en el JWT. */
const ROLE_CLAIM = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';

/**
 * Datos del usuario en sesion, leidos del token ya guardado.
 *
 * OJO: esto sirve para DECIDIR QUE MOSTRAR, nunca para proteger nada. El token
 * vive en el navegador y se puede manipular; quien decide de verdad es el backend,
 * que comprueba el rol en el controlador y otra vez dentro del servicio.
 */
@Injectable({ providedIn: 'root' })
export class CurrentUserService {
  private claims(): Record<string, any> | null {
    try {
      const raw = localStorage.getItem('tokenData');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  get email(): string {
    return this.claims()?.['Email'] ?? '';
  }

  get role(): string {
    return this.claims()?.[ROLE_CLAIM] ?? this.claims()?.['Role'] ?? '';
  }

  get companyId(): number | null {
    const v = this.claims()?.['CompanyId'];
    return v ? Number(v) : null;
  }

  get isSuperAdmin(): boolean {
    return this.role === 'SuperAdmin';
  }
}
