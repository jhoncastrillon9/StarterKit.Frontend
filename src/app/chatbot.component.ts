import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, HostListener } from '@angular/core';
import { trigger, transition, style, animate, state } from '@angular/animations';
import { ConfirmationModalComponent } from './shared/components/reusable-modal/reusable-modal.component';
import { ChatbotSignalRService, ChatMessage, ChatFileResponse, ConnectionStatus } from './shared/services/chatbot-signalr.service';
import { Subscription } from 'rxjs';

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

  // Chat state
  isOpen = false;
  isMobile = false;
  connectionStatus: ConnectionStatus = 'disconnected';

  // Confirmation modal
  showConfirmationModal = false;
  confirmationMessage = '¿Estas seguro de que quieres borrar toda la conversacion?';

  constructor(private chatService: ChatbotSignalRService) {}

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
    if (this.message.trim()) {
      this.chatService.sendMessage(this.message);
      this.message = '';
      this.shouldScrollToBottom = true;
    }
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
}
