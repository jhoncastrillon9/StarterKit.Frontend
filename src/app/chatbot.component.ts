import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { ConfirmationModalComponent } from './shared/components/reusable-modal/reusable-modal.component';
import { ChatbotSignalRService, ChatMessage } from './shared/services/chatbot-signalr.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.scss']
})
export class ChatbotComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer?: ElementRef;
  @ViewChild('confirmationModal') confirmationModal?: ConfirmationModalComponent;
  
  message = '';
  messages: ChatMessage[] = [];
  isBotTyping = false;
  private subs: Subscription[] = [];
  private shouldScrollToBottom = false;

  // Modal de confirmación
  showConfirmationModal = false;
  confirmationMessage = '¿Estás seguro de que quieres borrar toda la conversación?';

  constructor(private chatService: ChatbotSignalRService) {
  }



  async ngOnInit() {
        // Suscribirse a los mensajes
    this.subs.push(
      this.chatService.messages$.subscribe((msgs: ChatMessage[]) => {
        this.messages = msgs;
        this.shouldScrollToBottom = true;
      })
    );

    // Suscribirse al evento BotTyping
    this.subs.push(
      this.chatService.botTyping$.subscribe((typing: boolean) => {
        this.isBotTyping = typing;
      })
    );

    // Esperar a que la conexión esté lista antes de pedir historial
    try {
      await this.chatService.waitForConnection();
      this.chatService.getHistory();
    } catch (error) {
      console.error('❌ Error al conectar con SignalR:', error);
    }
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
      console.error('Error al hacer scroll:', err);
    }
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  sendMessage() {
    if (this.message.trim()) {      
      this.chatService.sendMessage(this.message);
      this.message = '';
      this.shouldScrollToBottom = true;
    }
  }

  openConfirmationModal() {
    if (this.confirmationModal) {
      this.confirmationModal.title = 'Confirmar';
      this.confirmationModal.messageModal = this.confirmationMessage;
      this.confirmationModal.isConfirmation = true;
      this.confirmationModal.titleButtonComfimationYes = 'Sí, borrar';
      this.confirmationModal.openModal();
    }
  }

  onConfirmDelete() {
    this.chatService.clearHistory();
    }
}