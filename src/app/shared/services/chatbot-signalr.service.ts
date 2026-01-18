import { Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { BehaviorSubject, Observable } from 'rxjs';
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
  private messagesSubject = new BehaviorSubject<string[]>([]);
  public messages$: Observable<string[]> = this.messagesSubject.asObservable();

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

    this.hubConnection.on('ReceiveMessage', (message: string) => {
      const current = this.messagesSubject.value;
      this.messagesSubject.next([...current, message]);
    });
  }

  public sendMessage(message: string): void {
    if (this.hubConnection) {
      const chatRequest = {
        Message: message,
        ConversationId: null // Puedes cambiar esto si tienes un ID de conversación
      };
      this.hubConnection.invoke('SendMessage', chatRequest)
        .catch(err => console.error('SendMessage Error:', err));
    }
  }
}
