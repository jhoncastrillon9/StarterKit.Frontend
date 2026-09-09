import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environment';
import { CreatePaymentTransferRequest } from '../models/payment.Model';

@Injectable({
  providedIn: 'root'
})
export class PaymentTransferService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private router: Router) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  create(data: CreatePaymentTransferRequest): Observable<any> {
    const headers = this.getHeaders();
    return this.http.post(`${this.apiUrl}/api/payment-transfer`, data, { headers, observe: 'response' }).pipe(
      map((response: HttpResponse<any>) => {
        if (response.status === 401) this.router.navigate(['/login']);
        return response.body;
      })
    );
  }

  getById(id: number): Observable<any> {
    const headers = this.getHeaders();
    return this.http.get(`${this.apiUrl}/api/payment-transfer/${id}`, { headers, observe: 'response' }).pipe(
      map((response: HttpResponse<any>) => {
        if (response.status === 401) this.router.navigate(['/login']);
        return response.body;
      })
    );
  }
}
