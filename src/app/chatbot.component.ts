import { Component, OnInit, OnDestroy } from '@angular/core';
import { ChatbotSignalRService, ChatMessage } from './shared/services/chatbot-signalr.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.scss']
})
export class ChatbotComponent implements OnInit, OnDestroy {
  message = '';
  messages: ChatMessage[] = [];
  conversationId: string = 'default'; // Puedes cambiar esto por un id real
  isBotTyping = false;
  private subs: Subscription[] = [];

  constructor(private chatService: ChatbotSignalRService) {}

  async ngOnInit() {
    // Suscribirse a los mensajes
    this.subs.push(
      this.chatService.messages$.subscribe((msgs: ChatMessage[]) => {
        this.messages = msgs;
      })
    );

    // Suscribirse al evento BotTyping
    this.subs.push(
      this.chatService.botTyping$.subscribe((typing: boolean) => {
        this.isBotTyping = typing;
      })
    );

    // Esperar a que la conexión esté lista antes de pedir historial
    await this.chatService.waitForConnection();
    this.chatService.getHistory(this.conversationId);
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  sendMessage() {
    if (this.message.trim()) {
      this.chatService.sendMessage(this.message, this.conversationId);
      this.message = '';
    }
  }

  clearConversation() {
    this.chatService.clearHistory(this.conversationId);
    // El historial local se limpiará solo cuando el backend emita el evento HistoryCleared
  }
}