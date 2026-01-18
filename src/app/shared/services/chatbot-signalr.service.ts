import { Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ChatMessage {
  sender: 'user' | 'bot';
  content: string;
  timestamp?: string;
}
import { environment } from '../../../environment';

// Ajusta esta función para obtener el token real del usuario
function getUserToken(): string | null {
  // Ejemplo: return localStorage.getItem('token');
  return localStorage.getItem('token');
}

@Injectable({
  providedIn: 'root',
})
export class ChatbotSignalRService {
  private hubConnection: HubConnection | null = null;
  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  public messages$: Observable<ChatMessage[]> = this.messagesSubject.asObservable();

  constructor() {
    this.startConnection();
  }

  private startConnection(): void {
    this.hubConnection = new HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}/hubs/chat`, {
        accessTokenFactory: () => getUserToken() || ''
      })
      .configureLogging(LogLevel.Information)
      .build();

    this.hubConnection.start()
      .then(() => console.log('SignalR Connected'))
      .catch(err => console.error('SignalR Connection Error:', err));

    this.hubConnection.on('ReceiveMessage', (response: any) => {
      // Mensaje del bot recibido
      let botMessage: ChatMessage = {
        sender: 'bot',
        content: '',
        timestamp: response?.message?.timestamp || new Date().toISOString()
      };
      if (response && response.message && response.message.content) {
        botMessage.content = response.message.content;
      } else if (response && response.errorMessage) {
        botMessage.content = `Error: ${response.errorMessage}`;
      } else {
        botMessage.content = JSON.stringify(response);
      }
      const current = this.messagesSubject.value;
      this.messagesSubject.next([...current, botMessage]);
    });

    // Obtener historial al conectar
    this.hubConnection.onclose(() => {
      this.messagesSubject.next([]);
    });
    this.hubConnection.on('ReceiveHistory', (history: any[]) => {
      // Esperamos un array de mensajes con sender, content, timestamp
      const mapped = history.map(msg => ({
        sender: msg.sender,
        content: msg.content,
        timestamp: msg.timestamp
      }));
      this.messagesSubject.next(mapped);
    });
  }

  public getHistory(conversationId: string): void {
    if (this.hubConnection) {
      this.hubConnection.invoke('GetHistory', conversationId)
        .catch(err => console.error('GetHistory Error:', err));
    }
  }
  public sendMessage(message: string, conversationId: string | null = null): void {
    if (this.hubConnection) {
      const chatRequest = {
        Message: message,
        ConversationId: conversationId
      };
      // Agregar mensaje del usuario al historial local
      const userMessage: ChatMessage = {
        sender: 'user',
        content: message,
        timestamp: new Date().toISOString()
      };
      const current = this.messagesSubject.value;
      this.messagesSubject.next([...current, userMessage]);
      this.hubConnection.invoke('SendMessage', chatRequest)
        .catch(err => console.error('SendMessage Error:', err));
    }
  }
}
