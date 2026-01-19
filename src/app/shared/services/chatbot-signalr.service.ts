import { Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { environment } from '../../../environment';

export interface ChatMessage {
  sender: 'user' | 'bot';
  content: string;
  timestamp?: string;
}

// Función para obtener el token real del usuario
function getUserToken(): string | null {
  return localStorage.getItem('token');
}

@Injectable({
  providedIn: 'root',
})
export class ChatbotSignalRService {
  private hubConnection: HubConnection | null = null;
  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  public messages$: Observable<ChatMessage[]> = this.messagesSubject.asObservable();
  private botTypingSubject = new Subject<boolean>();
  public botTyping$ = this.botTypingSubject.asObservable();

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

    // Evento BotTyping
    this.hubConnection.on('BotTyping', (isTyping: boolean) => {
      this.botTypingSubject.next(isTyping);
    });

    // Evento de conexión cerrada
    this.hubConnection.onclose(() => {
      this.messagesSubject.next([]);
    });

    // Evento de historial recibido
    this.hubConnection.on('ReceiveHistory', (history: any[]) => {
      const mapped = history.map(msg => ({
        sender: msg.sender,
        content: msg.content,
        timestamp: msg.timestamp
      }));
      this.messagesSubject.next(mapped);
    });

    // Evento de historial borrado
    this.hubConnection.on('HistoryCleared', (conversationId: string) => {
      this.messagesSubject.next([]);
    });
  }

  /**
   * Espera a que la conexión esté en estado Connected
   */
  public async waitForConnection(): Promise<void> {
    if (!this.hubConnection) return;
    if (this.hubConnection.state === 'Connected') return;
    return new Promise((resolve) => {
      const check = () => {
        if (this.hubConnection && this.hubConnection.state === 'Connected') {
          resolve();
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  }

  /**
   * Envía un mensaje al bot
   */
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

  /**
   * Solicita el historial de la conversación al backend
   */
  public getHistory(conversationId: string): void {
    if (this.hubConnection) {
      this.hubConnection.invoke('GetHistory', conversationId)
        .catch(err => console.error('GetHistory Error:', err));
    }
  }

  /**
   * Solicita al backend borrar el historial de la conversación
   */
  public clearHistory(conversationId: string): void {
    if (this.hubConnection) {
      this.hubConnection.invoke('ClearHistory', conversationId)
        .catch(err => console.error('ClearHistory Error:', err));
    }
  }
}