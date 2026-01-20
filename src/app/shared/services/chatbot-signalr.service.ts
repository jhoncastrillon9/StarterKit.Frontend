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
  
  // ID del mensaje que está siendo transmitido en streaming
  private currentStreamingMessageId: string | null = null;

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
      .catch(err => {
        console.error('SignalR Connection Error (primer intento):', err);
        // Segundo intento tras 1 segundo
        setTimeout(() => {
          this.hubConnection?.start()
            .then(() => console.log('SConnected (segundo intento)'))
            .catch(err2 => console.error('SignalR Connection Error (segundo intento):', err2));
        }, 1000);
      });

    // Evento de inicio de streaming
    this.hubConnection.on('StreamStart', (userId: string) => {
      this.botTypingSubject.next(true);
      
      // Crear mensaje vacío del bot para empezar a acumular chunks
      const messageId = new Date().getTime().toString();
      this.currentStreamingMessageId = messageId;
      
      const botMessage: ChatMessage = {
        id: messageId,
        sender: 'bot',
        content: '',
        timestamp: new Date().toISOString(),
        isStreaming: true
      };
      
      const current = this.messagesSubject.value;
      this.messagesSubject.next([...current, botMessage]);
    });

    // Evento para recibir fragmentos de streaming
    this.hubConnection.on('StreamChunk', (response: any) => {
      const chunk = response?.chunk || '';
      
      if (!this.currentStreamingMessageId) {
        console.error('No hay mensaje de streaming activo');
        return;
      }
      
      const current = this.messagesSubject.value;
      const existingIndex = current.findIndex(m => m.id === this.currentStreamingMessageId);
      
      if (existingIndex >= 0) {
        // Actualizar mensaje existente agregando el fragmento
        const updated = [...current];
        updated[existingIndex] = {
          ...updated[existingIndex],
          content: updated[existingIndex].content + chunk
        };
        this.messagesSubject.next(updated);
      }
    });

    // Evento de fin de streaming
    this.hubConnection.on('StreamEnd', (userId: string) => {
      if (this.currentStreamingMessageId) {
        const current = this.messagesSubject.value;
        const existingIndex = current.findIndex(m => m.id === this.currentStreamingMessageId);
        
        if (existingIndex >= 0) {
          // Marcar el mensaje como completado
          const updated = [...current];
          updated[existingIndex] = {
            ...updated[existingIndex],
            isStreaming: false
          };
          this.messagesSubject.next(updated);
        }
        
        this.currentStreamingMessageId = null;
      }
      
      this.botTypingSubject.next(false);
    });

    // Mantener el evento ReceiveMessage por compatibilidad (si el backend lo usa)
    this.hubConnection.on('ReceiveMessage', (response: any) => {
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

    // Evento de conexión cerrada
    this.hubConnection.onclose(() => {
      // Quitar log de cierre de conexión
    });

    // Evento de historial recibido
    this.hubConnection.on('ReceiveHistory', (response: any) => {
      let history: ChatMessageDTO[] = [];
      
      if (Array.isArray(response)) {
        history = response;
      } else if (response && Array.isArray(response.messages)) {
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
   * Envía un mensaje al bot usando streaming
   */
  public sendMessage(message: string): void {
    if (this.hubConnection) {
      const chatRequest = {
        Message: message
      };
      
      // Agregar mensaje del usuario al historial local
      const userMessage: ChatMessage = {
        id: new Date().getTime().toString(),
        sender: 'user',
        content: message,
        timestamp: new Date().toISOString(),
        isStreaming: false
      };
      const current = this.messagesSubject.value;
      this.messagesSubject.next([...current, userMessage]);
      
      // Invocar el método de streaming
      this.hubConnection.invoke('SendMessageStreaming', chatRequest)
        .catch(err => {
          console.error('SendMessageStreaming Error:', err);
          this.botTypingSubject.next(false);
        });
    }
  }

  /**
   * Solicita el historial de la conversación al backend
   */

  public async getHistory(): Promise<void> {
    await this.waitForConnection();
    if (this.hubConnection) {
      this.hubConnection.invoke('GetHistory')
        .catch(err => console.error('GetHistory Error:', err));
    }
  }

  /**
   * Solicita al backend borrar el historial de la conversación
   */

  public async clearHistory(): Promise<void> {
    await this.waitForConnection();
    if (this.hubConnection) {
      this.hubConnection.invoke('ClearHistory')
        .catch(err => console.error('ClearHistory Error:', err));
    }
  }
}