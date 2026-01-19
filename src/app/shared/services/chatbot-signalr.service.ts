import { Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { environment } from '../../../environment';

export interface ChatMessage {
  id?: string;
  sender: 'user' | 'bot' | 'assistant';
  content: string;
  timestamp?: string;
  isStreaming?: boolean;
}

// DTO que viene del backend
export interface ChatMessageDTO {
  id: string;
  content: string;
  role: string; // 'user' | 'assistant' | 'system'
  timestamp: string;
  isStreaming: boolean;
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
      .configureLogging(LogLevel.Error)
      .build();

    this.hubConnection.start()
       .then(() => console.log('SConnected')) 
      .catch(err => console.error('SignalR Connection Error:', err));

    this.hubConnection.on('ReceiveMessage', (response: any) => {
      // Mensaje del bot recibido
      let botMessage: ChatMessage = {
        id: response?.message?.id || response?.id,
        sender: this.mapRoleToSender(response?.message?.role || response?.role || 'assistant'),
        content: '',
        timestamp: response?.message?.timestamp || response?.timestamp || new Date().toISOString(),
        isStreaming: response?.message?.isStreaming || false
      };
      
      if (response && response.message && response.message.content) {
        botMessage.content = response.message.content;
      } else if (response && response.content) {
        botMessage.content = response.content;
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
      // Quitar log de cierre de conexión
    });

    // Evento de historial recibido - ACTUALIZADO para manejar el objeto wrapper
    this.hubConnection.on('ReceiveHistory', (response: any) => {

      
      // El backend envía: { conversationId: "...", messages: [...] }
      let history: ChatMessageDTO[] = [];
      
      if (Array.isArray(response)) {
        // Si viene directo como array
        history = response;
      } else if (response && Array.isArray(response.messages)) {
        // Si viene envuelto en un objeto con propiedad 'messages'
        history = response.messages;
      } else {
        console.error('Formato de historial no reconocido:', response);
        return;
      }
      

      
      const mapped: ChatMessage[] = history.map(dto => ({
        id: dto.id,
        sender: this.mapRoleToSender(dto.role),
        content: dto.content,
        timestamp: dto.timestamp,
        isStreaming: dto.isStreaming
      }));      
      
      this.messagesSubject.next(mapped);
    });

    // Evento de historial borrado
    this.hubConnection.on('HistoryCleared', (conversationId: string) => {
      
      this.messagesSubject.next([]);
    });
  }

  /**
   * Mapea el role del backend ('user', 'assistant', 'system') al sender del frontend
   */
  private mapRoleToSender(role: string): 'user' | 'bot' | 'assistant' {
    if (role === 'user') return 'user';
    if (role === 'assistant' || role === 'bot') return 'bot';
    return 'bot'; // default
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
  public sendMessage(message: string): void {
    if (this.hubConnection) {
      const chatRequest = {
        Message: message
      };
      // Agregar mensaje del usuario al historial local
      const userMessage: ChatMessage = {
        id: new Date().getTime().toString(), // ID temporal
        sender: 'user',
        content: message,
        timestamp: new Date().toISOString(),
        isStreaming: false
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
  public getHistory(): void {
    if (this.hubConnection) {
      this.hubConnection.invoke('GetHistory')
        .catch(err => console.error('GetHistory Error:', err));
    }
  }

  /**
   * Solicita al backend borrar el historial de la conversación
   */
  public clearHistory(): void {
    if (this.hubConnection) {
      this.hubConnection.invoke('ClearHistory')
        .catch(err => console.error('ClearHistory Error:', err));
    }
  }
}