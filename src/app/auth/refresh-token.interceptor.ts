import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { environment } from 'src/environment';
import { TokenStorageService } from './token-storage.service';

/**
 * Renueva la sesión sola cuando el token de acceso caduca.
 *
 * El problema que resuelve: el token duraba cinco horas y no se renovaba, así
 * que el usuario se caía en mitad de lo que estuviera haciendo. Ahora dura una
 * hora y se cambia por uno nuevo sin que se note.
 *
 * Lo delicado es la concurrencia. Una pantalla lanza cinco peticiones a la vez;
 * si las cinco fallan con 401, cinco refrescos a la vez rotarían el token cinco
 * veces y cuatro llegarían con uno ya anulado — que el backend interpreta, con
 * razón, como que alguien tiene una copia, y cierra todas las sesiones. Por eso
 * solo se refresca UNA vez y las demás esperan a ese resultado.
 */
@Injectable()
export class RefreshTokenInterceptor implements HttpInterceptor {
  private readonly storage = inject(TokenStorageService);
  private readonly router = inject(Router);

  /** Un refresco en curso bloquea a los demás. */
  private refrescando = false;

  /** Donde esperan las peticiones que llegaron durante el refresco. */
  private readonly tokenNuevo = new BehaviorSubject<string | null>(null);

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // El propio refresco y el login no pasan por aquí: intentar renovar la
    // sesión para poder renovar la sesión no acaba nunca.
    if (this.esDeAutenticacion(req.url)) return next.handle(req);

    return next.handle(req).pipe(
      catchError(error => {
        const es401 = error instanceof HttpErrorResponse && error.status === 401;
        if (!es401 || !this.storage.refreshToken) return throwError(() => error);

        return this.refrescarYReintentar(req, next);
      }),
    );
  }

  private refrescarYReintentar(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (this.refrescando) {
      // Esperar al refresco que ya está en marcha y reintentar con su token.
      return this.tokenNuevo.pipe(
        filter((t): t is string => t !== null),
        take(1),
        switchMap(token => next.handle(this.conToken(req, token))),
      );
    }

    this.refrescando = true;
    this.tokenNuevo.next(null);

    return new Observable<string>(observer => {
      fetch(`${environment.apiUrl}/api/Auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.storage.refreshToken }),
      })
        .then(async r => {
          if (!r.ok) throw new Error(String(r.status));
          return r.json();
        })
        .then(data => {
          this.storage.save(data);
          observer.next(data.token);
          observer.complete();
        })
        .catch(e => observer.error(e));
    }).pipe(
      switchMap(token => {
        this.refrescando = false;
        this.tokenNuevo.next(token);
        return next.handle(this.conToken(req, token));
      }),
      catchError(e => {
        // El refresco falló: la sesión se acabó de verdad. Se limpia todo y se
        // vuelve al login, que es mejor que dejar al usuario dando vueltas
        // contra una pantalla que no carga nada.
        this.refrescando = false;
        this.storage.clear();
        this.router.navigate(['/login']);
        return throwError(() => e);
      }),
    );
  }

  private conToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
    return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  private esDeAutenticacion(url: string): boolean {
    return url.includes('/api/Auth/refresh')
        || url.includes('/api/Auth/login')
        || url.includes('/api/Auth/register')
        || url.includes('/api/Auth/logout');
  }
}
