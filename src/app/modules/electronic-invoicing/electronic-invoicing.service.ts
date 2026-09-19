import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environment';

export interface SetupStep {
  key: string;
  title: string;
  what: string;
  why: string;
  where: string;
  status: 'Pendiente' | 'EnCurso' | 'Hecho';
  manualCheck: boolean;
  link?: string | null;
}

export interface TestSetItem {
  type: string;
  label: string;
  required: number;
  accepted: number;
  missing: number;
  isComplete: boolean;
}

export interface ElectronicInvoicingSetup {
  environment: number;
  environmentName: string;
  operationMode: string;
  softwareId?: string | null;
  softwarePin?: string | null;
  testSetId?: string | null;
  certificateStatus: string;
  certificateFileName?: string | null;
  certificateExpiresAt?: string | null;
  habilitationStatus: string;
  habilitatedAt?: string | null;
  steps: SetupStep[];
  testSet: TestSetItem[];
  testSetProgress: number;
  testSetMissing?: string | null;
  canIssue: boolean;
  blockedReason?: string | null;
}

export interface NoteLine {
  description: string;
  unitMeasurement: string;
  quantity: number;
  unitPrice: number;
  ivaRate: number;
}

export interface Note {
  creditDebitNoteId: number;
  noteType: number;
  noteTypeName: string;
  invoiceId: number;
  fullNumber?: string | null;
  status: string;
  reasonCode: string;
  reasonDescription: string;
  referencedNumber?: string | null;
  referencedCufe?: string | null;
  subtotal: number;
  iva: number;
  total: number;
  cude?: string | null;
  issueDate?: string | null;
  dianStatus?: string | null;
  dianStatusMessage?: string | null;
  qrUrl?: string | null;
  customerName?: string | null;
  lines: NoteLine[];
}

export interface InvoiceBalance {
  invoiceId: number;
  total: number;
  creditedAmount: number;
  debitedAmount: number;
  outstanding: number;
  isAnnulled: boolean;
  isFullyCredited: boolean;
  noteCount: number;
}

export interface IssueResult {
  success: boolean;
  documentKey?: string | null;
  number?: string | null;
  qrUrl?: string | null;
  status: string;
  message: string;
  simulated: boolean;
  electronicDocumentId?: number | null;
}

@Injectable({ providedIn: 'root' })
export class ElectronicInvoicingService {
  private readonly http = inject(HttpClient);
  private readonly setupUrl = `${environment.apiUrl}/api/ElectronicInvoicing`;
  private readonly noteUrl = `${environment.apiUrl}/api/CreditDebitNote`;

  private headers(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    });
  }

  getSetup(): Observable<ElectronicInvoicingSetup> {
    return this.http.get<ElectronicInvoicingSetup>(`${this.setupUrl}/setup`, { headers: this.headers() });
  }

  updateSetup(body: Record<string, unknown>): Observable<ElectronicInvoicingSetup> {
    return this.http.put<ElectronicInvoicingSetup>(`${this.setupUrl}/setup`, body, { headers: this.headers() });
  }

  generateInvoiceDocument(invoiceId: number, testSet = false): Observable<IssueResult> {
    return this.http.post<IssueResult>(
      `${this.setupUrl}/invoice/${invoiceId}/generate?testSet=${testSet}`, {}, { headers: this.headers() });
  }

  /** El XML es la prueba del documento: se descarga como archivo. */
  xmlUrl(documentType: string, sourceId: number): string {
    return `${this.setupUrl}/xml/${documentType}/${sourceId}`;
  }

  downloadXml(documentType: string, sourceId: number): Observable<Blob> {
    return this.http.get(this.xmlUrl(documentType, sourceId), {
      headers: new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('token')}` }),
      responseType: 'blob',
    });
  }

  // ------------------------------------------------------------------ notas

  getNotes(): Observable<Note[]> {
    return this.http.get<Note[]>(this.noteUrl, { headers: this.headers() });
  }

  getNotesByInvoice(invoiceId: number): Observable<Note[]> {
    return this.http.get<Note[]>(`${this.noteUrl}/by-invoice/${invoiceId}`, { headers: this.headers() });
  }

  getBalance(invoiceId: number): Observable<InvoiceBalance> {
    return this.http.get<InvoiceBalance>(`${this.noteUrl}/balance/${invoiceId}`, { headers: this.headers() });
  }

  createNote(body: Record<string, unknown>): Observable<Note> {
    return this.http.post<Note>(this.noteUrl, body, { headers: this.headers() });
  }

  issueNote(noteId: number, testSet = false): Observable<IssueResult> {
    return this.http.post<IssueResult>(
      `${this.noteUrl}/${noteId}/issue?testSet=${testSet}`, {}, { headers: this.headers() });
  }

  deleteNote(noteId: number): Observable<void> {
    return this.http.delete<void>(`${this.noteUrl}/${noteId}`, { headers: this.headers() });
  }
}
