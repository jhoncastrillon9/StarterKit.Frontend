import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../../../../environment';
import { Product, ProductPagedResponse } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private router: Router) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    return headers;
  }

  getPaged(search: string = '', page: number = 1, pageSize: number = 10): Observable<ProductPagedResponse> {
    const headers = this.getHeaders();
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get(`${this.apiUrl}/api/Product/paged`, { headers, params, observe: 'response' }).pipe(
      map((response: HttpResponse<any>) => {
        if (response.status === 401) {
          this.router.navigate(['/login']);
        }
        return response.body;
      })
    );
  }

  getById(id: number): Observable<Product> {
    const headers = this.getHeaders();
    return this.http.get(`${this.apiUrl}/api/Product/${id}`, { headers, observe: 'response' }).pipe(
      map((response: HttpResponse<any>) => {
        if (response.status === 401) {
          this.router.navigate(['/login']);
        }
        return response.body;
      })
    );
  }

  add(product: Product): Observable<Product> {
    const headers = this.getHeaders();
    return this.http.post(`${this.apiUrl}/api/Product`, product, { headers, observe: 'response' }).pipe(
      map((response: HttpResponse<any>) => {
        if (response.status === 401) {
          this.router.navigate(['/login']);
        }
        return response.body;
      })
    );
  }

  update(id: number, product: Product): Observable<Product> {
    const headers = this.getHeaders();
    return this.http.put(`${this.apiUrl}/api/Product/${id}`, product, { headers, observe: 'response' }).pipe(
      map((response: HttpResponse<any>) => {
        if (response.status === 401) {
          this.router.navigate(['/login']);
        }
        return response.body;
      })
    );
  }

  delete(id: number): Observable<any> {
    const headers = this.getHeaders();
    return this.http.delete(`${this.apiUrl}/api/Product/${id}`, { headers, observe: 'response' }).pipe(
      map((response: HttpResponse<any>) => {
        if (response.status === 401) {
          this.router.navigate(['/login']);
        }
        return response.body;
      })
    );
  }
}
