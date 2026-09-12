import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, HostListener } from '@angular/core';
import { trigger, transition, style, animate, state } from '@angular/animations';
import { ConfirmationModalComponent } from './shared/components/reusable-modal/reusable-modal.component';
import { ChatbotSignalRService, ChatMessage, ChatFileResponse, ConnectionStatus } from './shared/services/chatbot-signalr.service';
import { ChatAttachment, ChatAttachmentService } from './shared/services/chat-attachment.service';
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

  constructor(
    private chatService: ChatbotSignalRService,
    private attachmentService: ChatAttachmentService
  ) {}

  async ngOnInit() {
    // Detect mobile
    this.checkMobile();

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
        const msg = error.error.message || error.error.title || error.error.Message;
        if (typeof msg === 'string' && msg.trim()) return msg;
      }
    }
    if (typeof error?.message === 'string' && error.message.trim()) return error.message;
    return 'No se pudo subir. Reintenta.';
  }
}
