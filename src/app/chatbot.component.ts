import { Component } from '@angular/core';
import { ChatbotSignalRService } from './shared/services/chatbot-signalr.service';

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.scss']
})
export class ChatbotComponent {
  message = '';
  messages: string[] = [];

  constructor(private chatService: ChatbotSignalRService) {
    this.chatService.messages$.subscribe((msgs: string[]) => this.messages = msgs);
  }

  sendMessage() {
    if (this.message.trim()) {
      this.chatService.sendMessage(this.message);
      this.message = '';
    }
  }
}
