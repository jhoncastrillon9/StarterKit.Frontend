import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { map, catchError } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { environment } from 'src/environment';
import { InvoiceResolutionModel } from '../models/invoice.Model';

@Injectable({ providedIn: 'root' })
export class InvoiceResolutionService {
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

  get(): Observable<InvoiceResolutionModel | null> {
    return this.handle<InvoiceResolutionModel>(
      this.http.get(`${this.apiUrl}/api/invoice-resolution`, { headers: this.getHeaders(), observe: 'response' })
    ).pipe(
      catchError((error) => {
        if (error.status === 404) {
          return of(null);
        }
        throw error;
      })
    );
  }

  save(resolution: InvoiceResolutionModel): Observable<InvoiceResolutionModel> {
    return this.handle<InvoiceResolutionModel>(
      this.http.put(`${this.apiUrl}/api/invoice-resolution`, resolution, { headers: this.getHeaders(), observe: 'response' }));
  }
}
