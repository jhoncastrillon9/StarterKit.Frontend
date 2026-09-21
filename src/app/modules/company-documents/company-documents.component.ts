import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from 'src/environment';

export interface CompanyDocument {
  companyDocumentId: number;
  name: string;
  category?: string | null;
  description?: string | null;
  fileUrl: string;
  fileName: string;
  contentType?: string | null;
  sizeBytes: number;
  expiresAt?: string | null;
  createdAt: string;
  daysToExpiry?: number | null;
  isExpired: boolean;
}

export interface Shipment {
  companyDocumentShipmentId: number;
  customerName?: string | null;
  toEmails: string;
  documentNames: string;
  message?: string | null;
  sentAt: string;
}

interface Customer {
  customerId: number;
  customerName: string;
  email: string;
}

/**
 * Documentos de la empresa.
 *
 * El constructor manda los mismos papeles a clientes distintos una y otra vez,
 * buscándolos en el correo o en el teléfono. Aquí viven en un sitio y se envían
 * marcando cuáles: nunca hay un "enviar todos", porque entre estos papeles hay
 * cédulas y documentos tributarios.
 */
@Component({
  selector: 'app-company-documents',
  standalone: true,
  imports: [CommonModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './company-documents.component.html',
  styleUrls: ['./company-documents.component.scss'],
})
export class CompanyDocumentsComponent implements OnInit {
  documents: CompanyDocument[] = [];
  shipments: Shipment[] = [];
  customers: Customer[] = [];

  loading = true;
  error = '';
  message = '';

  /** Ids marcados para enviar. */
  selected = new Set<number>();

  showUpload = false;
  showSend = false;
  showHistory = false;
  saving = false;

  upload = { name: '', category: '', description: '', expiresAt: '', file: null as File | null };

  /**
   * Al elegir "Otro" hay que decir cuál. Sin eso, en la lista de envío aparecen
   * tres documentos llamados "Otro" y no hay forma de saber cuál se le está
   * mandando al cliente.
   */
  get needsName(): boolean {
    return this.upload.category === 'Otro' && !this.upload.name.trim();
  }
  send = { customerId: null as number | null, emails: '', message: '' };

  /** Sugerencias, no una lista cerrada: cada obra pide papeles distintos. */
  readonly categories = [
    'Cámara de Comercio', 'RUT', 'Documento de identidad',
    'Póliza', 'Certificación bancaria', 'Certificado', 'Otro',
  ];

  private readonly apiUrl = `${environment.apiUrl}/api/CompanyDocument`;

  constructor(private http: HttpClient) {}

  private headers(json = true): HttpHeaders {
    const h: Record<string, string> = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    if (json) h['Content-Type'] = 'application/json';
    return new HttpHeaders(h);
  }

  ngOnInit(): void {
    this.load();
    this.loadCustomers();
  }

  load(): void {
    this.loading = true;
    this.http.get<CompanyDocument[]>(this.apiUrl, { headers: this.headers() }).subscribe({
      next: d => { this.documents = d; this.loading = false; },
      error: () => { this.loading = false; this.error = 'No se pudieron cargar los documentos.'; },
    });
  }

  /**
   * Al elegir cliente se traen sus correos, como al reenviar una cotización.
   * Escribirlos a mano cada vez es donde se cuela el correo equivocado.
   */
  onCustomerChange(): void {
    const cliente = this.customers.find(c => c.customerId === this.send.customerId);
    // No se pisa lo que el usuario ya escribió: puede haberlo puesto a mano a propósito.
    if (cliente?.email && !this.send.emails.trim()) this.send.emails = cliente.email;
  }

  loadCustomers(): void {
    this.http.get<Customer[]>(`${environment.apiUrl}/api/Customer/customer`, { headers: this.headers() })
      .subscribe({ next: c => this.customers = c, error: () => { /* el envío admite correos sueltos */ } });
  }

  loadShipments(): void {
    this.showHistory = !this.showHistory;
    if (!this.showHistory || this.shipments.length) return;
    this.http.get<Shipment[]>(`${this.apiUrl}/shipments`, { headers: this.headers() })
      .subscribe({ next: s => this.shipments = s, error: () => { /* silencioso */ } });
  }

  // ---------------------------------------------------------------- Selección

  toggle(id: number): void {
    if (this.selected.has(id)) this.selected.delete(id); else this.selected.add(id);
  }

  isSelected(id: number): boolean {
    return this.selected.has(id);
  }

  get selectedDocs(): CompanyDocument[] {
    return this.documents.filter(d => this.selected.has(d.companyDocumentId));
  }

  /** Avisa antes de mandarle a un cliente un papel caducado. */
  get selectedExpired(): CompanyDocument[] {
    return this.selectedDocs.filter(d => d.isExpired);
  }

  // ---------------------------------------------------------------- Acciones

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.upload.file = file;
    // El nombre del archivo suele servir: se propone y el usuario lo ajusta.
    if (!this.upload.name) this.upload.name = file.name.replace(/\.[^.]+$/, '');
  }

  doUpload(): void {
    if (!this.upload.file || !this.upload.name.trim()) {
      this.message = 'Elige un archivo y ponle un nombre.';
      return;
    }
    const form = new FormData();
    form.append('file', this.upload.file, this.upload.file.name);
    form.append('name', this.upload.name.trim());
    if (this.upload.category) form.append('category', this.upload.category);
    if (this.upload.description) form.append('description', this.upload.description);
    if (this.upload.expiresAt) form.append('expiresAt', this.upload.expiresAt);

    this.saving = true;
    this.http.post<CompanyDocument>(this.apiUrl, form, { headers: this.headers(false) }).subscribe({
      next: d => {
        this.saving = false;
        this.documents = [...this.documents, d];
        this.showUpload = false;
        this.upload = { name: '', category: '', description: '', expiresAt: '', file: null };
        this.message = `"${d.name}" guardado.`;
      },
      error: e => {
        this.saving = false;
        this.message = e?.error?.error || 'No se pudo subir el documento.';
      },
    });
  }

  remove(doc: CompanyDocument): void {
    if (!confirm(`¿Quitar "${doc.name}" de tus documentos?`)) return;
    this.http.delete(`${this.apiUrl}/${doc.companyDocumentId}`, { headers: this.headers() }).subscribe({
      next: () => {
        this.documents = this.documents.filter(d => d.companyDocumentId !== doc.companyDocumentId);
        this.selected.delete(doc.companyDocumentId);
        this.message = `"${doc.name}" eliminado.`;
      },
      error: () => this.message = 'No se pudo eliminar el documento.',
    });
  }

  /** Lo que se va a mandar y a quién, para que se pueda leer antes de mandarlo. */
  confirming = false;

  get sendSummary(): { docs: string[]; emails: string[] } {
    const emails = this.send.emails.split(/[;,]/).map(e => e.trim()).filter(Boolean);
    const cliente = this.customers.find(c => c.customerId === this.send.customerId);

    return {
      docs: this.selectedDocs.map(d => d.name),
      emails: emails.length ? emails : (cliente?.email ? [cliente.email] : []),
    };
  }

  /**
   * Primer paso: enseñar qué se manda y a quién.
   *
   * Estos papeles llevan datos de la empresa, y una vez enviados no se pueden
   * recoger. Un botón que manda sin preguntar convierte un clic de más en un
   * correo que no debía salir.
   */
  askConfirm(): void {
    if (this.selected.size === 0) {
      this.message = 'Marca los documentos que quieres enviar.';
      return;
    }

    if (this.sendSummary.emails.length === 0) {
      this.message = 'Falta a qué correo mandarlo: elige un cliente o escribe un correo.';
      return;
    }

    this.confirming = true;
  }

  doSend(): void {
    if (this.selected.size === 0) {
      this.message = 'Marca los documentos que quieres enviar.';
      return;
    }
    const emails = this.send.emails
      .split(/[;,]/).map(e => e.trim()).filter(Boolean);

    this.confirming = false;
    this.saving = true;
    this.http.post<Shipment>(`${this.apiUrl}/send`, {
      documentIds: [...this.selected],
      customerId: this.send.customerId,
      emails,
      message: this.send.message || null,
    }, { headers: this.headers() }).subscribe({
      next: s => {
        this.saving = false;
        this.showSend = false;
        this.selected.clear();
        this.shipments = [s, ...this.shipments];
        this.send = { customerId: null, emails: '', message: '' };
        this.message = `Enviado a ${s.toEmails}.`;
      },
      error: e => {
        this.saving = false;
        this.message = e?.error?.error || 'No se pudo enviar.';
      },
    });
  }

  // ------------------------------------------------------------ Presentación

  peso(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  fecha(v?: string | null): string {
    return v ? new Date(v).toLocaleDateString('es-CO') : '—';
  }

  icono(doc: CompanyDocument): string {
    const t = doc.contentType || '';
    if (t.includes('pdf')) return 'fa-file-pdf';
    if (t.includes('image')) return 'fa-file-image';
    if (t.includes('word')) return 'fa-file-word';
    if (t.includes('sheet') || t.includes('excel')) return 'fa-file-excel';
    return 'fa-file';
  }

  /** Texto de caducidad; lo que importa es si conviene mandarlo hoy. */
  caducidad(doc: CompanyDocument): string {
    if (!doc.expiresAt) return '';
    if (doc.isExpired) return `Venció el ${this.fecha(doc.expiresAt)}`;
    const dias = doc.daysToExpiry ?? 0;
    if (dias <= 30) return `Vence en ${dias} ${dias === 1 ? 'día' : 'días'}`;
    return `Vigente hasta el ${this.fecha(doc.expiresAt)}`;
  }
}
