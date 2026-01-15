import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Router } from '@angular/router'; // Importa el módulo Router
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from 'src/environment';


@Injectable({
  providedIn: 'root'
})
export class BudgetService {
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
    return this.http.get(`${this.apiUrl}/api/Budget/budget`, { headers, observe: 'response' }).pipe(
      map((response: HttpResponse<any>) => {
        if (response.status === 401) {
          this.router.navigate(['/login']);
        }
        return response.body;
      })
    );
  }

  getWithDetail() {
    const headers = this.getHeaders();
    return this.http.get(`${this.apiUrl}/api/Budget/GetAllWithDetails`, { headers, observe: 'response' }).pipe(
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
    return this.http.get(`${this.apiUrl}/api/Budget/budget/${data}`, { headers, observe: 'response' }).pipe(
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
    const body = this.http.post(`${this.apiUrl}/api/Budget/budget`, data, { headers, observe: 'response' }).pipe(
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
    return this.http.put(`${this.apiUrl}/api/Budget/budget`, data, { headers, observe: 'response' }).pipe(
      map((response: HttpResponse<any>) => {
        if (response.status === 401) {
          this.router.navigate(['/login']);
        }
        return response.body;
      })
    );
  }

  updateStatus(data: any) {
    const headers = this.getHeaders();
    return this.http.put(`${this.apiUrl}/api/Budget/Updatestatus`, data, { headers, observe: 'response' }).pipe(
      map((response: HttpResponse<any>) => {
        if (response.status === 401) {
          this.router.navigate(['/login']);
        }
        return response.body;
      })
    );
  }

  setInvoice(data: any) {
    const headers = this.getHeaders();
    return this.http.put(`${this.apiUrl}/api/Budget/setInvoice`, data, { headers, observe: 'response' }).pipe(
      map((response: HttpResponse<any>) => {
        if (response.status === 401) {
          this.router.navigate(['/login']);
        }
        return response.body;
      })
    );
  }

  updateExternalInvoice(data: any) {
    const headers = this.getHeaders();
    return this.http.put(`${this.apiUrl}/api/Budget/updateExternalInvoice`, data, { headers, observe: 'response' }).pipe(
      map((response: HttpResponse<any>) => {
        if (response.status === 401) {
          this.router.navigate(['/login']);
        }
        return response.body;
      })
    );
  }

  copyBudget(data: any) {
    const headers = this.getHeaders();
    return this.http.post(`${this.apiUrl}/api/Budget/copy`, data, { headers, observe: 'response' }).pipe(
      map((response: HttpResponse<any>) => {
        if (response.status === 401) {
          this.router.navigate(['/login']);
        }
        return response.body;
      })
    );
  }

  sendEmailBudget(data: any) {
    const headers = this.getHeaders();
    return this.http.post(`${this.apiUrl}/api/Budget/sendBudgetPdf`, data, { headers, observe: 'response' }).pipe(
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
    return this.http.delete(`${this.apiUrl}/api/Budget/budget?id=${data}`, { headers, observe: 'response' }).pipe(
      map((response: HttpResponse<any>) => {
        if (response.status === 401) {
          this.router.navigate(['/login']);
        }
        return response.body;
      })
    );
  }

  download(budgetId: number): Observable<Blob> {
    const headers = this.getHeaders();

    return this.http.get(`${this.apiUrl}/api/Budget/budgetPdf/${budgetId}`, {
      headers,
      responseType: 'blob',
    });
  }

  downloadExcel(budgetId: number): Observable<Blob> {
    const headers = this.getHeaders();

    return this.http.get(`${this.apiUrl}/api/Budget/budgetExcel/${budgetId}`, {
      headers,
      responseType: 'blob',
    });
  }

  downloadSchedule(budgetId: number, weeks: number, startDate: string): Observable<Blob> {
    const headers = this.getHeaders();

    return this.http.get(`${this.apiUrl}/api/Budget/budgetSchedule/${budgetId}?weeks=${weeks}&startDate=${startDate}`, {
      headers,
      responseType: 'blob',
    });
  }

  sendAudioToDetails(formData: FormData): Observable<any> {
    const headers = this.getHeaders();
    // No incluir Content-Type para que el navegador lo establezca automáticamente con el boundary para FormData
    const headersWithoutContentType = new HttpHeaders({
      'Authorization': headers.get('Authorization') || ''
    });

    return this.http.post(`${this.apiUrl}/api/Budget/audio-to-details`, formData, {
      headers: headersWithoutContentType,
      observe: 'response'
    }).pipe(
      map((response: HttpResponse<any>) => {
        if (response.status === 401) {
          this.router.navigate(['/login']);
        }
        return response.body;
      })
    );
  }

  mergeBudgets(data: any): Observable<any> {
    const headers = this.getHeaders();
    return this.http.post(`${this.apiUrl}/api/Budget/merge`, data, { headers, observe: 'response' }).pipe(
      map((response: HttpResponse<any>) => {
        if (response.status === 401) {
          this.router.navigate(['/login']);
        }
        return response.body;
      })
    );
  }
}