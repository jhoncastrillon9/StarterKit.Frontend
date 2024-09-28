import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Router } from '@angular/router'; 
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../../../../environment';


@Injectable({
    providedIn: 'root'
  })
  export class BudgetConfigurationService {
    private apiUrl = environment.apiUrl;
  
    constructor(private http: HttpClient, private router: Router) { }
  
    private getHeaders(): HttpHeaders {
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`,
      });
      return headers;
    } 
  
    getBudgetConfigByCompanyId() {
      const headers = this.getHeaders();
      return this.http.get(`${this.apiUrl}/api/getBudgetConfigByCompanyId`, { headers, observe: 'response' }).pipe(
        map((response: HttpResponse<any>) => {
          if (response.status === 401) {
            this.router.navigate(['/login']);
          }
          return response.body;
        })
      );
    }  
  
    updateBudgetConfigByUser(data: FormData) {
      const headers = this.getHeaders();
      return this.http.put(`${this.apiUrl}/api/budgetConfig`, data, { headers, observe: 'response' }).pipe(
        map((response: HttpResponse<any>) => {
          if (response.status === 401) {
            this.router.navigate(['/login']);
          }
          return response.body;
        })
      );
    }  
  }
  