import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://jhoncastrillonsp-001-site1.ctempurl.com'; // Reemplaza con la URL real del endpoint

  constructor(private http: HttpClient) { }

  login(data: any) {
    return this.http.post(`${this.apiUrl}/api/Auth/login`, data);
  }
}