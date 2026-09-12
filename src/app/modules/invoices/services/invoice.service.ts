import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from 'src/environment';
import { InvoiceModel } from '../models/invoice.Model';

@Injectable({ providedIn: 'root' })
export class InvoiceService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private router: Router) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  private handle<T>(source: Observable<HttpResponse<any>>): Observable<T> {
    return source.pipe(
      map((response: HttpResponse<any>) => {
        if (response.status === 401) {
          this.router.navigate(['/login']);
        }
        return response.body as T;
      })
    );
  }

  get(): Observable<InvoiceModel[]> {
    return this.handle<InvoiceModel[]>(
      this.http.get(`${this.apiUrl}/api/Invoice/invoice`, { headers: this.getHeaders(), observe: 'response' }));
  }

  getById(id: number): Observable<InvoiceModel> {
    return this.handle<InvoiceModel>(
      this.http.get(`${this.apiUrl}/api/Invoice/invoice/${id}`, { headers: this.getHeaders(), observe: 'response' }));
  }

  /**
   * Facturas de una cotizacion, borradores incluidos. Devuelve [] si no tiene ninguna
   * o si la cotizacion es de otra compania, nunca 404.
   */
  getByBudget(budgetId: number): Observable<InvoiceModel[]> {
    return this.handle<InvoiceModel[]>(
      this.http.get(`${this.apiUrl}/api/Invoice/from-budget/${budgetId}/invoices`, { headers: this.getHeaders(), observe: 'response' }));
  }

  createDraftFromBudget(budgetId: number): Observable<InvoiceModel> {
    return this.handle<InvoiceModel>(
      this.http.post(`${this.apiUrl}/api/Invoice/from-budget/${budgetId}`, {}, { headers: this.getHeaders(), observe: 'response' }));
  }

  update(invoice: InvoiceModel): Observable<InvoiceModel> {
    return this.handle<InvoiceModel>(
      this.http.put(`${this.apiUrl}/api/Invoice/invoice`, invoice, { headers: this.getHeaders(), observe: 'response' }));
  }

  issue(id: number): Observable<InvoiceModel> {
    return this.handle<InvoiceModel>(
      this.http.post(`${this.apiUrl}/api/Invoice/invoice/${id}/issue`, {}, { headers: this.getHeaders(), observe: 'response' }));
  }

  send(id: number, emails: string[]): Observable<any> {
    return this.handle<any>(
      this.http.post(`${this.apiUrl}/api/Invoice/invoice/${id}/send`, { emails }, { headers: this.getHeaders(), observe: 'response' }));
  }

  issueAndSend(budgetId: number, emails: string[]): Observable<InvoiceModel> {
    return this.handle<InvoiceModel>(
      this.http.post(`${this.apiUrl}/api/Invoice/from-budget/${budgetId}/issue-and-send`, { emails }, { headers: this.getHeaders(), observe: 'response' }));
  }

  downloadPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/api/Invoice/invoice/${id}/pdf`, {
      headers: this.getHeaders(),
      responseType: 'blob'
    });
  }
}
