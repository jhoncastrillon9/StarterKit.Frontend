import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from 'src/environment';
import { BudgetHistoryFilterRequest, BudgetHistoryResponse } from '../models/budget-history.model';

@Injectable({
  providedIn: 'root'
})
export class BudgetHistoryService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private router: Router) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
    });
    return headers;
  }

  getHistory(filter: BudgetHistoryFilterRequest): Observable<BudgetHistoryResponse> {
    const headers = this.getHeaders();
    return this.http.post<BudgetHistoryResponse>(
      `${this.apiUrl}/api/BudgetHistory/history`, 
      filter, 
      { headers, observe: 'response' }
    ).pipe(
      map((response: HttpResponse<BudgetHistoryResponse>) => {
        if (response.status === 401) {
          this.router.navigate(['/login']);
        }
        return response.body as BudgetHistoryResponse;
      })
    );
  }

  restoreFromHistory(historyId: number): Observable<any> {
    const headers = this.getHeaders();
    return this.http.post(
      `${this.apiUrl}/api/BudgetHistory/restore-from-history/${historyId}`, 
      {}, 
      { headers, observe: 'response' }
    ).pipe(
      map((response: HttpResponse<any>) => {
        if (response.status === 401) {
          this.router.navigate(['/login']);
        }
        return response.body;
      })
    );
  }
}
