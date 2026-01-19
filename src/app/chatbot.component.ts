import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { ChatbotSignalRService, ChatMessage } from './shared/services/chatbot-signalr.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.scss']
})
export class ChatbotComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer?: ElementRef;
  
  message = '';
  messages: ChatMessage[] = [];
  conversationId: string = '';
  isBotTyping = false;
  private subs: Subscription[] = [];
  private shouldScrollToBottom = false;

  constructor(private chatService: ChatbotSignalRService) {
    // Obtener o crear conversationId
    this.conversationId = this.getOrCreateConversationId();
  }

  /**
   * Obtiene el conversationId guardado o crea uno nuevo
   */
  private getOrCreateConversationId(): string {
    const stored = localStorage.getItem('chatbot_conversation_id');
    if (stored) {
      return stored;
    }
    // Crear nuevo ID único
    const newId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('chatbot_conversation_id', newId);
    return newId;
  }

  async ngOnInit() {
    console.log('🚀 Iniciando chatbot con conversationId:', this.conversationId);
    
    // Suscribirse a los mensajes
    this.subs.push(
      this.chatService.messages$.subscribe((msgs: ChatMessage[]) => {
        console.log('📩 Mensajes recibidos:', msgs);
        console.log('📊 Total de mensajes:', msgs.length);
        
        // Log detallado de cada mensaje para debugging
        msgs.forEach((msg, index) => {
          console.log(`  Mensaje ${index + 1}:`, {
            sender: msg.sender,
            content: msg.content.substring(0, 50) + '...',
            timestamp: msg.timestamp
          });
        });
        
        this.messages = msgs;
        this.shouldScrollToBottom = true;
      })
    );

    // Suscribirse al evento BotTyping
    this.subs.push(
      this.chatService.botTyping$.subscribe((typing: boolean) => {
        console.log('⌨️ Bot typing:', typing);
        this.isBotTyping = typing;
      })
    );

    // Esperar a que la conexión esté lista antes de pedir historial
    try {
      await this.chatService.waitForConnection();
      console.log('✅ Conexión establecida, solicitando historial...');
      this.chatService.getHistory(this.conversationId);
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
      console.log('📤 Enviando mensaje:', this.message);
      this.chatService.sendMessage(this.message, this.conversationId);
      this.message = '';
      this.shouldScrollToBottom = true;
    }
  }

  clearConversation() {
    if (confirm('¿Estás seguro de que quieres borrar toda la conversación?')) {
      this.chatService.clearHistory(this.conversationId);
      // Crear nuevo conversationId para empezar de cero
      const newId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('chatbot_conversation_id', newId);
      this.conversationId = newId;
      console.log('Nueva conversación creada:', newId);
    }
  }
}