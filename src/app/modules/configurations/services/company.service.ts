import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Router } from '@angular/router'; 
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../../../../environment';



@Injectable({
    providedIn: 'root'
  })
  export class CompanyService {
    private apiUrl = environment.apiUrl;
  
    constructor(private http: HttpClient, private router: Router) { }
  
    private getHeaders(): HttpHeaders {
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`,
      });
      return headers;
    } 
  
    getCompanyByUser() {
      const headers = this.getHeaders();
      return this.http.get(`${this.apiUrl}/api/Company/getCompanyByUser`, { headers, observe: 'response' }).pipe(
        map((response: HttpResponse<any>) => {
          if (response.status === 401) {
            this.router.navigate(['/login']);
          }
          return response.body;
        })
      );
    }  

    updateCompanyByUser(data: any) {
      const headers = this.getHeaders();
      return this.http.put(`${this.apiUrl}/api/Company/updateCompanyByUser`, data, { headers, observe: 'response' }).pipe(
        map((response: HttpResponse<any>) => {
          if (response.status === 401) {
            this.router.navigate(['/login']);
          }
          return response.body;
        })
      );
    }  

  }