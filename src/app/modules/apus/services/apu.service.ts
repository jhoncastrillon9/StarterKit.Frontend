import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Router } from '@angular/router'; // Importa el módulo Router
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../../../../environment';

@Injectable({
    providedIn: 'root'
  })
  export class ApuService {
    private apiUrl = environment.apiUrl;
  
    constructor(private http: HttpClient, private router: Router) { }
  
    private getHeaders(): HttpHeaders {
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`,
      });
      return headers;
    }
  
    get() {
      const headers = this.getHeaders();
      return this.http.get(`${this.apiUrl}/api/UnitPriceAnalysis/UnitPriceAnalysis`, { headers, observe: 'response' }).pipe(
        map((response: HttpResponse<any>) => {
          if (response.status === 401) {
            this.router.navigate(['/login']);
          }
          return response.body;
        })
      );
    }
  
    getById(data: any) {
      const headers = this.getHeaders();
      return this.http.get(`${this.apiUrl}//api/UnitPriceAnalysis/UnitPriceAnalysis/${data}`, { headers, observe: 'response' }).pipe(
        map((response: HttpResponse<any>) => {
          if (response.status === 401) {
            this.router.navigate(['/login']);
          }
          return response.body;
        })
      );
    }
  
    add(data: any): Observable<any> {
      const headers = this.getHeaders();
      const body = this.http.post(`${this.apiUrl}/api/UnitPriceAnalysis/UnitPriceAnalysis/`, data, { headers, observe: 'response' }).pipe(
        map((response: HttpResponse<any>) => {
          if (response.status === 401) {
            this.router.navigate(['/login']);
          }
          return response.body;
        })
      );

      return body;
    }
  
    update(data: any) {
      const headers = this.getHeaders();
      return this.http.put(`${this.apiUrl}/api/UnitPriceAnalysis/UnitPriceAnalysis`, data, { headers, observe: 'response' }).pipe(
        map((response: HttpResponse<any>) => {
          if (response.status === 401) {
            this.router.navigate(['/login']);
          }
          return response.body;
        })
      );
    }
  
    delete(data: any) {
      const headers = this.getHeaders();
      return this.http.delete(`${this.apiUrl}/api/Customer/customer?id=${data}`, { headers, observe: 'response' }).pipe(
        map((response: HttpResponse<any>) => {
          if (response.status === 401) {
            this.router.navigate(['/login']);
          }
          return response.body;
        })
      );
    }
  }