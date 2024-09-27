import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl; // Reemplaza con la URL real del endpoint

  constructor(private http: HttpClient) { }

  login(data: any) {
    return this.http.post(`${this.apiUrl}/api/Auth/login`, data);
  }

  validateCodePasword(data: any) {
    return this.http.post(`${this.apiUrl}/api/Auth/validateCodePassword`, data);
  }

  register(data: any) {
    return this.http.post(`${this.apiUrl}/api/Auth/register`, data);
  }

  changePassword(data: any) {
    return this.http.post(`${this.apiUrl}/api/Auth/changePassword`, data);
  }

  recoveryPassword(data: any) {
    return this.http.post(`${this.apiUrl}/api/Auth/recoveryPassword`, data);
  }
}