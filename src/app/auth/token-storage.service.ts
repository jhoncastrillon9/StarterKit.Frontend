import { Injectable } from '@angular/core';

/**
 * Único sitio donde se guardan y se leen los tokens.
 *
 * Antes cada pantalla hacía su `localStorage.setItem('token', ...)` por su
 * cuenta, y por eso no había ningún sitio donde cerrar sesión: no existía el
 * concepto. Con el token de refresco eso deja de ser sostenible, porque ahora
 * hay dos tokens y una caducidad que hay que mirar antes de cada petición.
 */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private static readonly ACCESO = 'token';
  private static readonly REFRESCO = 'refreshToken';
  private static readonly CADUCA = 'tokenExpiresAt';

  /** Guarda lo que devuelve el login, el registro o un refresco. */
  save(respuesta: { token?: string; refreshToken?: string | null; expiresAt?: string | null }): void {
    if (respuesta?.token) localStorage.setItem(TokenStorageService.ACCESO, respuesta.token);
    if (respuesta?.refreshToken) localStorage.setItem(TokenStorageService.REFRESCO, respuesta.refreshToken);
    if (respuesta?.expiresAt) localStorage.setItem(TokenStorageService.CADUCA, respuesta.expiresAt);
  }

  get accessToken(): string | null {
    return localStorage.getItem(TokenStorageService.ACCESO);
  }

  get refreshToken(): string | null {
    return localStorage.getItem(TokenStorageService.REFRESCO);
  }

  /**
   * Si conviene renovar ya. Se adelanta un minuto al vencimiento para que la
   * renovación ocurra ANTES de que una petición falle, y no después: enterarse
   * con un 401 significa que el usuario ya vio algo raro.
   *
   * Sin fecha guardada devuelve false: es el caso de una sesión abierta antes de
   * que existiera el refresco, y esa se renovará cuando falle.
   */
  shouldRefresh(now = Date.now()): boolean {
    const caduca = localStorage.getItem(TokenStorageService.CADUCA);
    if (!caduca || !this.refreshToken) return false;

    const t = Date.parse(caduca);
    if (Number.isNaN(t)) return false;

    return t - now < 60_000;
  }

  clear(): void {
    localStorage.removeItem(TokenStorageService.ACCESO);
    localStorage.removeItem(TokenStorageService.REFRESCO);
    localStorage.removeItem(TokenStorageService.CADUCA);
    localStorage.removeItem('tokenData');
  }
}
