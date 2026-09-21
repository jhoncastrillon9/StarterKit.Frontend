import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environment';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UserProfile {
  email: string;
  name?: string;
  role?: string;
}

/** Perfil que devuelve el backend (api/Profile/me). */
export interface MyProfile {
  userId: number;
  userName: string;
  email: string;
  role: string;
  urlImage: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private apiUrl = environment.apiUrl;

  /**
   * Fotografia del usuario en curso. Vive aqui y no en el componente de perfil
   * porque la cabecera tambien la pinta: antes el avatar de la barra era una
   * imagen fija del bundle y no cambiaba nunca, aunque el usuario subiera la suya.
   * Cadena vacia = usar el avatar por defecto.
   */
  private readonly photoSubject = new BehaviorSubject<string>('');
  readonly photo$ = this.photoSubject.asObservable();

  /** La pone al dia quien recibe un perfil del backend. */
  setPhoto(url: string | null | undefined): void {
    this.photoSubject.next(url || '');
  }

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
    });
    return headers;
  }

  /**
   * Obtiene los datos del perfil del usuario desde el token almacenado
   */
  getUserProfile(): UserProfile | null {
    const tokenDataString = localStorage.getItem('tokenData');
    if (tokenDataString) {
      const tokenData = JSON.parse(tokenDataString);
      return {
        email: tokenData.Email || '',
        name: tokenData.Name || tokenData.FullName || '',
        role: tokenData.Role || ''
      };
    }
    return null;
  }

  /** Perfil del usuario autenticado, desde el backend (no desde el token). */
  getMyProfile(): Observable<MyProfile> {
    return this.http.get<MyProfile>(`${this.apiUrl}/api/Profile/me`, { headers: this.getHeaders() })
      .pipe(tap(p => this.setPhoto(p?.urlImage)));
  }

  /** Sustituye la fotografia del usuario autenticado. */
  updateMyPhoto(file: File): Observable<MyProfile> {
    const form = new FormData();
    form.append('photo', file, file.name);
    // Sin Content-Type: el navegador pone el boundary del multipart.
    return this.http.put<MyProfile>(`${this.apiUrl}/api/Profile/me/photo`, form, { headers: this.getHeaders() })
      .pipe(tap(p => this.setPhoto(p?.urlImage)));
  }

  /** Quita la fotografia del usuario autenticado. */
  removeMyPhoto(): Observable<MyProfile> {
    return this.http.delete<MyProfile>(`${this.apiUrl}/api/Profile/me/photo`, { headers: this.getHeaders() })
      .pipe(tap(p => this.setPhoto(p?.urlImage)));
  }

  /** Actualiza los datos personales editables. */
  updateMyProfile(userName: string): Observable<MyProfile> {
    return this.http.put<MyProfile>(`${this.apiUrl}/api/Profile/me`, { userName }, { headers: this.getHeaders() });
  }

  /**
   * Cambia la contraseña del usuario autenticado
   */
  changeMyPassword(data: ChangePasswordRequest): Observable<any> {
    const headers = this.getHeaders();
    return this.http.post(`${this.apiUrl}/api/Auth/changeMyPassword`, data, { headers });
  }
}
