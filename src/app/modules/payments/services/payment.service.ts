import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environment';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {

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
    return this.http.get(`${this.apiUrl}/api/payment/payment`, { headers, observe: 'response' }).pipe(
      map((response: HttpResponse<any>) => {
        if (response.status === 401) {
          this.router.navigate(['/login']);
        }
        return response.body;
      })
    );
  }

  getByBudgetId(data: any) {
    const headers = this.getHeaders();
    return this.http.get(`${this.apiUrl}/api/payment/byBudgetId/${data}`, { headers, observe: 'response' }).pipe(
      map((response: HttpResponse<any>) => {
        if (response.status === 401) {
          this.router.navigate(['/login']);
        }
        return response.body;
      })
    );
  }
  
  getByPaymentId(data: any) {
    const headers = this.getHeaders();
    return this.http.get(`${this.apiUrl}/api/payment/${data}`, { headers, observe: 'response' }).pipe(
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
    const body = this.http.post(`${this.apiUrl}/api/payment/payment`, data, { headers, observe: 'response' }).pipe(
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
    return this.http.put(`${this.apiUrl}/api/payment/payment`, data, { headers, observe: 'response' }).pipe(
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
    return this.http.delete(`${this.apiUrl}/api/payment/payment?id=${data}`, { headers, observe: 'response' }).pipe(
      map((response: HttpResponse<any>) => {
        if (response.status === 401) {
          this.router.navigate(['/login']);
        }
        return response.body;
      })
    );
  }


}
