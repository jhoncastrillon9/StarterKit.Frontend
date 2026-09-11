import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment';

export interface ChatAttachment {
  attachmentId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  kind: 'document' | 'image';
  preview: string;
  url: string;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_ATTACHMENTS = 3;
const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv', '.pdf', '.png', '.jpg', '.jpeg', '.webp'];

@Injectable({ providedIn: 'root' })
export class ChatAttachmentService {
  readonly maxAttachments = MAX_ATTACHMENTS;
  readonly acceptAttribute = ALLOWED_EXTENSIONS.join(',');

  constructor(private http: HttpClient) {}

  /** Devuelve el mensaje de error, o null si el archivo es aceptable. */
  validate(file: File): string | null {
    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return 'Solo se aceptan Excel, CSV, PDF e imagenes.';
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return 'El archivo supera los 10 MB.';
    }

    return null;
  }

  upload(file: File): Observable<ChatAttachment> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
    });

    return this.http.post<ChatAttachment>(`${environment.apiUrl}/api/chat/attachment`, formData, { headers });
  }
}
