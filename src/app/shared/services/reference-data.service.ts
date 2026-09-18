import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, shareReplay } from 'rxjs/operators';
import { environment } from '../../../environment';

/** Un valor de catálogo oficial. */
export interface ReferenceItem {
  code: string;
  name: string;
  parentCode?: string | null;
}

/**
 * Catálogos de valores oficiales (DIAN, DANE, ISO).
 *
 * Los catálogos planos y cortos (tipos de documento, países, unidades) se cachean
 * en memoria: son los mismos para todos y no cambian durante la sesión. Los
 * jerárquicos o con búsqueda van siempre al servidor, porque el resultado depende
 * de lo que el usuario escriba.
 */
@Injectable({ providedIn: 'root' })
export class ReferenceDataService {
  private readonly apiUrl = `${environment.apiUrl}/api/ReferenceData`;
  private readonly cache = new Map<string, Observable<ReferenceItem[]>>();

  constructor(private http: HttpClient) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('token')}` });
  }

  get(catalog: string, parentCode?: string | null, search?: string | null): Observable<ReferenceItem[]> {
    const cacheable = !parentCode && !search;
    if (cacheable && this.cache.has(catalog)) return this.cache.get(catalog)!;

    let params = new HttpParams();
    if (parentCode) params = params.set('parent', parentCode);
    if (search) params = params.set('search', search);

    const req = this.http
      .get<ReferenceItem[]>(`${this.apiUrl}/${catalog}`, { headers: this.headers(), params })
      .pipe(
        // Un catálogo que no responde no debe tumbar el formulario: el campo se
        // queda vacío y el usuario puede seguir con el resto.
        catchError(() => of([] as ReferenceItem[])),
        shareReplay({ bufferSize: 1, refCount: false }),
      );

    if (cacheable) this.cache.set(catalog, req);
    return req;
  }
}
