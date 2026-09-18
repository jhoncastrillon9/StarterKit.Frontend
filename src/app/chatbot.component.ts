import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, HostListener } from '@angular/core';
import { trigger, transition, style, animate, state } from '@angular/animations';
import { ConfirmationModalComponent } from './shared/components/reusable-modal/reusable-modal.component';
import { ChatbotSignalRService, ChatMessage, ChatFileResponse, ConnectionStatus } from './shared/services/chatbot-signalr.service';
import { ChatAttachment, ChatAttachmentService } from './shared/services/chat-attachment.service';
import { ChatContext, ChatbotUiService } from './shared/services/chatbot-ui.service';
import { SpeechInputError, SpeechInputService, SpeechInputState } from './shared/services/speech-input.service';
import { Subscription } from 'rxjs';

interface PendingAttachment {
  localId: string;
  file: File;
  status: 'uploading' | 'ready' | 'error';
  /** Distingue un rechazo de validación local (no reintentable: el archivo
   *  sigue siendo inválido) de un fallo al subir al backend (sí reintentable). */
  kind?: 'validation' | 'upload';
  error?: string;
  uploaded?: ChatAttachment;
}

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.scss'],
  animations: [
    trigger('fabAnimation', [
      transition(':enter', [
        style({ transform: 'scale(0)', opacity: 0 }),
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'scale(1)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'scale(0)', opacity: 0 }))
      ])
    ]),
    trigger('chatWindowAnimation', [
      transition(':enter', [
        style({ transform: 'translateY(20px) scale(0.95)', opacity: 0 }),
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'translateY(0) scale(1)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'translateY(20px) scale(0.95)', opacity: 0 }))
      ])
    ])
  ]
})
export class ChatbotComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer?: ElementRef;
  @ViewChild('confirmationModal') confirmationModal?: ConfirmationModalComponent;
  @ViewChild('messageInput') messageInput?: ElementRef;

  message = '';
  messages: ChatMessage[] = [];
  isBotTyping = false;
  private subs: Subscription[] = [];
  private shouldScrollToBottom = false;

  pendingAttachments: PendingAttachment[] = [];
  isDraggingOver = false;

  // Chat state
  isOpen = false;
  isMobile = false;
  connectionStatus: ConnectionStatus = 'disconnected';

  // Confirmation modal
  showConfirmationModal = false;
  confirmationMessage = '¿Estas seguro de que quieres borrar toda la conversacion?';

  // Dictado por voz
  micState: SpeechInputState = 'idle';
  micHint = '';

  // Contexto de trabajo activo (cotizacion abierta, catalogo de productos...)
  context: ChatContext | null = null;

  constructor(
    private chatService: ChatbotSignalRService,
    private attachmentService: ChatAttachmentService,
    private chatUi: ChatbotUiService,
    private speech: SpeechInputService
  ) {}

  async ngOnInit() {
    // Detect mobile
    this.checkMobile();

    this.micState = this.speech.isSupported ? 'idle' : 'unsupported';

    // Apertura desde otros modulos ("Crear con IA", "Agregar desde IA", ...)
    this.subs.push(
      this.chatUi.open$.subscribe(req => {
        this.isOpen = true;
        this.shouldScrollToBottom = true;
        if (req.prefill) this.message = req.prefill;
        setTimeout(() => this.messageInput?.nativeElement?.focus(), 350);
      })
    );

    this.subs.push(
      this.chatUi.context$.subscribe(ctx => { this.context = ctx; })
    );

    // Subscribe to messages
    this.subs.push(
      this.chatService.messages$.subscribe((msgs: ChatMessage[]) => {
        this.messages = msgs;
        this.shouldScrollToBottom = true;
      })
    );

    // Subscribe to bot typing
    this.subs.push(
      this.chatService.botTyping$.subscribe((typing: boolean) => {
        this.isBotTyping = typing;
        if (typing) {
          this.shouldScrollToBottom = true;
        }
      })
    );

    // Subscribe to connection status
    this.subs.push(
      this.chatService.connectionStatus$.subscribe((status: ConnectionStatus) => {
        this.connectionStatus = status;
      })
    );

    // Wait for connection and get history
    try {
      await this.chatService.waitForConnection();
      this.chatService.getHistory();
    } catch (error) {
      console.error('Error connecting to SignalR:', error);
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.checkMobile();
  }

  private checkMobile(): void {
    this.isMobile = window.innerWidth <= 600;
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling:', err);
    }
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
    this.speech.cancel();
  }

  // ---------- Contexto ----------

  /** Texto del banner de contexto; null si el chat es de proposito general. */
  get contextLabel(): string | null {
    const c = this.context;
    if (!c) return null;
    if (c.scope === 'budget') {
      const code = c.internalCode ?? c.budgetId;
      return c.label ? `Cotizacion ${code} — ${c.label}` : `Cotizacion ${code}`;
    }
    if (c.scope === 'products') return 'Catalogo de productos';
    return 'Cotizaciones';
  }

  clearContext(): void {
    this.chatUi.clearContext();
  }

  get inputPlaceholder(): string {
    if (this.micState === 'listening') return 'Escuchando...';
    if (this.micState === 'processing') return 'Transcribiendo...';
    return 'Escribe un mensaje...';
  }

  // ---------- Dictado por voz ----------

  get micSupported(): boolean {
    return this.micState !== 'unsupported';
  }

  get micTitle(): string {
    switch (this.micState) {
      case 'listening': return 'Detener y transcribir';
      case 'processing': return 'Transcribiendo...';
      default: return 'Dictar mensaje';
    }
  }

  async toggleMic(): Promise<void> {
    if (this.micState === 'processing') return;

    if (this.micState === 'listening') {
      this.micState = 'processing';
      this.micHint = '';
      try {
        const text = await this.speech.stopAndTranscribe();
        // El texto se deja en el input para que el usuario lo revise antes de
        // enviarlo: el dictado no manda el mensaje por su cuenta.
        this.message = this.message.trim() ? `${this.message.trim()} ${text}` : text;
        this.micState = 'idle';
        setTimeout(() => this.messageInput?.nativeElement?.focus(), 0);
      } catch (err) {
        this.applyMicError(err);
      }
      return;
    }

    this.micHint = '';
    try {
      await this.speech.start();
      this.micState = 'listening';
      this.micHint = 'Grabando. Pulsa de nuevo para transcribir.';
    } catch (err) {
      this.applyMicError(err);
    }
  }

  private applyMicError(err: unknown): void {
    if (err instanceof SpeechInputError) {
      this.micState = err.state;
      this.micHint = err.message;
    } else {
      this.micState = 'error';
      this.micHint = 'No se pudo usar el microfono.';
    }
    // 'unsupported' es permanente; el resto vuelve a 'idle' para poder reintentar.
    if (this.micState !== 'unsupported') {
      setTimeout(() => {
        if (this.micState !== 'listening' && this.micState !== 'processing') {
          this.micState = 'idle';
          this.micHint = '';
        }
      }, 6000);
    }
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.shouldScrollToBottom = true;
      // Focus input after animation
      setTimeout(() => {
        this.messageInput?.nativeElement?.focus();
      }, 350);
    }
  }

  closeChat(): void {
    this.isOpen = false;
    // Cerrar con el microfono abierto dejaria el stream vivo y el led encendido.
    if (this.micState === 'listening') {
      this.speech.cancel();
      this.micState = 'idle';
      this.micHint = '';
    }
  }

  sendMessage(): void {
    if (!this.canSend) return;

    const attachments = this.pendingAttachments
      .filter(a => a.status === 'ready' && a.uploaded)
      .map(a => a.uploaded as ChatAttachment);

    this.chatService.sendMessage(this.message, attachments);
    this.message = '';
    this.pendingAttachments = [];
    this.shouldScrollToBottom = true;
  }

  formatTime(timestamp: string): string {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  }

  async manualReconnect(): Promise<void> {
    await this.chatService.reconnect();
  }

  openConfirmationModal(): void {
    if (this.confirmationModal) {
      this.confirmationModal.title = 'Confirmar';
      this.confirmationModal.messageModal = this.confirmationMessage;
      this.confirmationModal.isConfirmation = true;
      this.confirmationModal.titleButtonComfimationYes = 'Si, borrar';
      this.confirmationModal.openModal();
    }
  }

  onConfirmDelete(): void {
    this.chatService.clearHistory();
  }

  getFileIcon(mimeType: string): string {
    if (!mimeType) return 'pi pi-file';

    if (mimeType.includes('pdf')) {
      return 'pi pi-file-pdf';
    } else if (mimeType.includes('word') || mimeType.includes('document')) {
      return 'pi pi-file-word';
    } else if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
      return 'pi pi-file-excel';
    } else if (mimeType.includes('image')) {
      return 'pi pi-image';
    } else if (mimeType.includes('zip') || mimeType.includes('compressed')) {
      return 'pi pi-file-zip';
    }
    return 'pi pi-file';
  }

  async downloadFile(fileResponse: ChatFileResponse): Promise<void> {
    if (!fileResponse?.url) return;

    try {
      const response = await fetch(fileResponse.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileResponse.fileName || 'archivo';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      // Fallback: abrir en nueva pestaña si falla la descarga directa
      window.open(fileResponse.url, '_blank');
    }
  }

  get acceptAttribute(): string {
    return this.attachmentService.acceptAttribute;
  }

  get maxAttachments(): number {
    return this.attachmentService.maxAttachments;
  }

  get isUploadingAttachments(): boolean {
    return this.pendingAttachments.some(a => a.status === 'uploading');
  }

  get canSend(): boolean {
    if (this.isBotTyping || this.isUploadingAttachments) return false;
    return !!this.message.trim() || this.pendingAttachments.some(a => a.status === 'ready');
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) this.addFiles(Array.from(input.files));
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingOver = false;
    if (event.dataTransfer?.files) this.addFiles(Array.from(event.dataTransfer.files));
  }

  removeAttachment(localId: string): void {
    this.pendingAttachments = this.pendingAttachments.filter(a => a.localId !== localId);
  }

  retryAttachment(pending: PendingAttachment): void {
    // Un error de validación local (extensión no permitida o >10MB) no se
    // arregla reintentando: el archivo sigue siendo inválido para el backend.
    if (pending.kind === 'validation') return;
    pending.status = 'uploading';
    pending.error = undefined;
    this.uploadAttachment(pending);
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  attachmentIcon(fileName: string): string {
    const name = fileName.toLowerCase();
    if (name.endsWith('.pdf')) return 'pi pi-file-pdf';
    if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) return 'pi pi-file-excel';
    return 'pi pi-image';
  }

  private addFiles(files: File[]): void {
    for (const file of files) {
      const free = this.attachmentService.maxAttachments - this.pendingAttachments.length;
      if (free <= 0) break;

      const localId = `${Date.now()}-${file.name}`;
      const validationError = this.attachmentService.validate(file);

      const pending: PendingAttachment = validationError
        ? { localId, file, status: 'error', kind: 'validation', error: validationError }
        : { localId, file, status: 'uploading' };

      this.pendingAttachments = [...this.pendingAttachments, pending];

      if (!validationError) this.uploadAttachment(pending);
    }
  }

  private uploadAttachment(pending: PendingAttachment): void {
    this.attachmentService.upload(pending.file).subscribe({
      next: uploaded => {
        pending.uploaded = uploaded;
        pending.status = 'ready';
      },
      error: (err: unknown) => {
        pending.status = 'error';
        pending.kind = 'upload';
        pending.error = this.extractUploadErrorMessage(err);
      }
    });
  }

  /** Extrae el mensaje de error que manda el backend; si no viene ninguno usable,
   *  cae al genérico. Antes se pisaba siempre con el genérico, incluso cuando el
   *  servidor mandaba un diagnóstico útil (p. ej. "tipo de archivo no soportado"). */
  private extractUploadErrorMessage(error: any): string {
    if (error?.error) {
      if (typeof error.error === 'string' && error.error.trim()) return error.error;
      if (typeof error.error === 'object') {
        // `error` en minuscula es la forma que usa StarterKitMiddleware para los errores
        // de negocio ({ error: 'mensaje en espanol' }); va primero porque es la nuestra.
        const msg = error.error.error || error.error.message || error.error.title || error.error.Message;
        if (typeof msg === 'string' && msg.trim()) return msg;
      }
    }
    if (typeof error?.message === 'string' && error.message.trim()) return error.message;
    return 'No se pudo subir. Reintenta.';
  }
}
