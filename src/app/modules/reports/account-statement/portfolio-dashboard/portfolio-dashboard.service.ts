import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environment';
import { PortfolioDashboardResponse } from './portfolio-dashboard.models';

/**
 * Agregados de cartera de la empresa. Mismo patrón de cabeceras y de manejo del
 * 401 que el resto de servicios del repo (ver customers/services/customer.service.ts).
 * `environment.apiUrl` no incluye `/api`.
 */
@Injectable({ providedIn: 'root' })
export class PortfolioDashboardService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = environment.apiUrl;

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  getDashboard(): Observable<PortfolioDashboardResponse> {
    const headers = this.getHeaders();
    return this.http
      .get(`${this.apiUrl}/api/report/account-statement/dashboard`, { headers, observe: 'response' })
      .pipe(
        map((response: HttpResponse<any>) => {
          if (response.status === 401) {
            this.router.navigate(['/login']);
          }
          return response.body as PortfolioDashboardResponse;
        })
      );
  }
}
