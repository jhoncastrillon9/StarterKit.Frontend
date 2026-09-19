import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environment';

/** Tipos de documento que la aplicacion sabe generar. */
export type DocumentType = 'Budget' | 'Invoice' | 'ProjectReport' | 'Schedule';

/**
 * Apariencia de un tipo de documento. Refleja DocumentTemplateConfigurationDTO.
 * Solo trae opciones que el generador de PDF sabe aplicar; ver
 * docs/arquitectura-configuracion-documentos.md en el backend.
 */
export interface DocumentTemplateConfiguration {
  documentTemplateConfigurationId: number;
  companyId: number;
  documentType: DocumentType;
  primaryColor: string | null;
  secondaryColor: string | null;
  budgetTemplateId: number | null;
  pageSize: 'A4' | 'LETTER';
  orientation: 'PORTRAIT' | 'LANDSCAPE';
  baseFontSize: number;
  showLogo: boolean;
  showIntroduction: boolean;
  showNotes: boolean;
  showSignature: boolean;
  showPaymentTerms: boolean;
  footerText: string | null;
  introduction: string | null;
}

@Injectable({ providedIn: 'root' })
export class DocumentTemplateConfigurationService {
  private readonly apiUrl = `${environment.apiUrl}/api/DocumentTemplateConfiguration`;

  constructor(private http: HttpClient) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    });
  }

  /** Configuracion de un tipo concreto. El backend nunca devuelve null. */
  get(documentType: DocumentType): Observable<DocumentTemplateConfiguration> {
    return this.http.get<DocumentTemplateConfiguration>(
      `${this.apiUrl}/${documentType}`, { headers: this.headers() });
  }

  getAll(): Observable<DocumentTemplateConfiguration[]> {
    return this.http.get<DocumentTemplateConfiguration[]>(this.apiUrl, { headers: this.headers() });
  }

  save(config: DocumentTemplateConfiguration): Observable<DocumentTemplateConfiguration> {
    return this.http.put<DocumentTemplateConfiguration>(this.apiUrl, config, { headers: this.headers() });
  }
}
