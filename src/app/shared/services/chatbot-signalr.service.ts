import { Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environment';

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
      .withUrl(`${environment.apiUrl}/hubs/chat`)
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
      this.hubConnection.invoke('SendMessage', message)
        .catch(err => console.error('SendMessage Error:', err));
    }
  }
}
