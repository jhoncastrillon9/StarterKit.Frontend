import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environment';
import { Observable } from 'rxjs';

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UserProfile {
  email: string;
  name?: string;
  role?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private apiUrl = environment.apiUrl;

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

  /**
   * Cambia la contraseña del usuario autenticado
   */
  changeMyPassword(data: ChangePasswordRequest): Observable<any> {
    const headers = this.getHeaders();
    return this.http.post(`${this.apiUrl}/api/Auth/changeMyPassword`, data, { headers });
  }
}
