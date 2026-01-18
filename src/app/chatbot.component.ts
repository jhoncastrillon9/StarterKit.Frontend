import { Component } from '@angular/core';
import { ChatbotSignalRService, ChatMessage } from './shared/services/chatbot-signalr.service';

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.scss']
})
export class ChatbotComponent {
  message = '';
  messages: ChatMessage[] = [];
  conversationId: string = 'default'; // Puedes cambiar esto por un id real

  constructor(private chatService: ChatbotSignalRService) {
    this.chatService.messages$.subscribe((msgs: ChatMessage[]) => this.messages = msgs);
    // Obtener historial al iniciar
    this.chatService.getHistory(this.conversationId);
  }

  sendMessage() {
    if (this.message.trim()) {
      this.chatService.sendMessage(this.message, this.conversationId);
      this.message = '';
    }
  }
}
