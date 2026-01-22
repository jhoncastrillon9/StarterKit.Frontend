import { Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { environment } from '../../../environment';

export interface ChatMessage {
  id?: string;
  sender: 'user' | 'bot' | 'assistant';
  content: string;
  timestamp?: string;
  isStreaming?: boolean;
  fileResponse?: ChatFileResponse;
}

export interface ChatMessageDTO {
  id: string;
  content: string;
  role: string;
  timestamp: string;
  isStreaming: boolean;
}

export interface ChatFileResponse {
  type: 'file_download' | 'error';
  fileName: string;
  url: string;
  mimeType: string;
  message: string;
  budgetId?: number;
  internalCode?: number;
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'reconnecting';

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

  // Connection status
  private connectionStatusSubject = new BehaviorSubject<ConnectionStatus>('disconnected');
  public connectionStatus$ = this.connectionStatusSubject.asObservable();

  // Reconnection configuration
  private readonly maxRetryAttempts = 10;
  private readonly baseDelayMs = 1000;
  private readonly maxDelayMs = 30000;
  private retryAttempt = 0;
  private reconnectTimeout: any = null;
  private isManuallyDisconnected = false;

  private currentStreamingMessageId: string | null = null;

  constructor() {
    this.startConnection();
  }

  private startConnection(): void {
    this.connectionStatusSubject.next('connecting');

    this.hubConnection = new HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}/hubs/chat`, {
        accessTokenFactory: () => getUserToken() || ''
      })
      .configureLogging(LogLevel.Error)
      .build();

    this.registerHubEvents();
    this.connect();
  }

  private registerHubEvents(): void {
    if (!this.hubConnection) return;

    // Connection closed event - trigger reconnection
    this.hubConnection.onclose((error) => {
      console.warn('SignalR connection closed', error);
      this.connectionStatusSubject.next('disconnected');

      if (!this.isManuallyDisconnected) {
        this.scheduleReconnect();
      }
    });

    // Stream start event
    this.hubConnection.on('StreamStart', (userId: string) => {
      this.botTypingSubject.next(true);

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

    // Stream chunk event
    this.hubConnection.on('StreamChunk', (response: any) => {
      const chunk = response?.chunk || '';

      if (!this.currentStreamingMessageId) {
        console.error('No active streaming message');
        return;
      }

      const current = this.messagesSubject.value;
      const existingIndex = current.findIndex(m => m.id === this.currentStreamingMessageId);

      if (existingIndex >= 0) {
        const updated = [...current];
        updated[existingIndex] = {
          ...updated[existingIndex],
          content: updated[existingIndex].content + chunk
        };
        this.messagesSubject.next(updated);
      }
    });

    // Stream end event
    this.hubConnection.on('StreamEnd', (userId: string) => {
      if (this.currentStreamingMessageId) {
        const current = this.messagesSubject.value;
        const existingIndex = current.findIndex(m => m.id === this.currentStreamingMessageId);

        if (existingIndex >= 0) {
          const updated = [...current];
          const existingMessage = updated[existingIndex];
          const processed = this.processMessageContent(existingMessage.content);

          updated[existingIndex] = {
            ...existingMessage,
            content: processed.content,
            fileResponse: processed.fileResponse,
            isStreaming: false
          };
          this.messagesSubject.next(updated);
        }

        this.currentStreamingMessageId = null;
      }

      this.botTypingSubject.next(false);
    });

    // Receive message event (fallback)
    this.hubConnection.on('ReceiveMessage', (response: any) => {
      let rawContent = '';

      if (response && response.message && response.message.content) {
        rawContent = response.message.content;
      } else if (response && response.content) {
        rawContent = response.content;
      } else if (response && response.errorMessage) {
        rawContent = `Error: ${response.errorMessage}`;
      } else {
        rawContent = JSON.stringify(response);
      }

      const processed = this.processMessageContent(rawContent);

      const botMessage: ChatMessage = {
        id: response?.message?.id || response?.id,
        sender: this.mapRoleToSender(response?.message?.role || response?.role || 'assistant'),
        content: processed.content,
        fileResponse: processed.fileResponse,
        timestamp: response?.message?.timestamp || response?.timestamp || new Date().toISOString(),
        isStreaming: response?.message?.isStreaming || false
      };

      const current = this.messagesSubject.value;
      this.messagesSubject.next([...current, botMessage]);
    });

    // Receive history event
    this.hubConnection.on('ReceiveHistory', (response: any) => {
      let history: ChatMessageDTO[] = [];

      if (Array.isArray(response)) {
        history = response;
      } else if (response && Array.isArray(response.messages)) {
        history = response.messages;
      } else {
        console.error('Unrecognized history format:', response);
        return;
      }

      const mapped: ChatMessage[] = history.map(dto => {
        const processed = this.processMessageContent(dto.content);
        return {
          id: dto.id,
          sender: this.mapRoleToSender(dto.role),
          content: processed.content,
          fileResponse: processed.fileResponse,
          timestamp: dto.timestamp,
          isStreaming: dto.isStreaming
        };
      });

      this.messagesSubject.next(mapped);
    });

    // History cleared event
    this.hubConnection.on('HistoryCleared', (conversationId: string) => {
      this.messagesSubject.next([]);
    });
  }

  private async connect(): Promise<void> {
    if (!this.hubConnection) return;

    try {
      await this.hubConnection.start();
      console.log('SignalR connected');
      this.connectionStatusSubject.next('connected');
      this.retryAttempt = 0;
      this.isManuallyDisconnected = false;
    } catch (error) {
      console.error('SignalR connection error:', error);
      this.connectionStatusSubject.next('disconnected');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.isManuallyDisconnected) return;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    if (this.retryAttempt >= this.maxRetryAttempts) {
      console.error(`Max reconnection attempts (${this.maxRetryAttempts}) reached`);
      return;
    }

    // Exponential backoff with jitter
    const delay = Math.min(
      this.baseDelayMs * Math.pow(2, this.retryAttempt) + Math.random() * 1000,
      this.maxDelayMs
    );

    this.retryAttempt++;
    console.log(`Reconnecting in ${Math.round(delay / 1000)}s (attempt ${this.retryAttempt}/${this.maxRetryAttempts})`);
    this.connectionStatusSubject.next('reconnecting');

    this.reconnectTimeout = setTimeout(async () => {
      if (this.hubConnection?.state === HubConnectionState.Disconnected) {
        await this.connect();
      }
    }, delay);
  }

  /**
   * Manually trigger reconnection
   */
  public async reconnect(): Promise<void> {
    this.isManuallyDisconnected = false;
    this.retryAttempt = 0;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.hubConnection?.state === HubConnectionState.Disconnected) {
      await this.connect();
    }
  }

  /**
   * Manually disconnect
   */
  public async disconnect(): Promise<void> {
    this.isManuallyDisconnected = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.hubConnection) {
      await this.hubConnection.stop();
      this.connectionStatusSubject.next('disconnected');
    }
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.hubConnection?.state === HubConnectionState.Connected;
  }

  private mapRoleToSender(role: string): 'user' | 'bot' | 'assistant' {
    if (role === 'user') return 'user';
    if (role === 'assistant' || role === 'bot') return 'bot';
    return 'bot';
  }

  /**
   * Parse content to check if it's a file download response (JSON format)
   */
  private parseJsonFileResponse(content: string): ChatFileResponse | null {
    if (!content) return null;

    try {
      const parsed = JSON.parse(content);
      if (parsed && (parsed.type === 'file_download' || parsed.type === 'error')) {
        return parsed as ChatFileResponse;
      }
    } catch {
      // Not JSON
    }
    return null;
  }

  /**
   * Parse Markdown links to detect file downloads
   * Detects patterns like: [Descargar Cotización 555 (PDF)](https://storage.blob.core.windows.net/...)
   */
  private parseMarkdownFileResponse(content: string): { fileResponse: ChatFileResponse; cleanContent: string } | null {
    if (!content) return null;

    // Regex to match Markdown links: [text](url)
    const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    const matches = [...content.matchAll(markdownLinkRegex)];

    if (matches.length === 0) return null;

    // Look for download links (blob storage, file extensions like .pdf, .docx, etc.)
    for (const match of matches) {
      const linkText = match[1];
      const url = match[2];

      // Check if it's a downloadable file (blob storage or common file extensions)
      const isDownloadable =
        url.includes('blob.core.windows.net') ||
        url.includes('/temp-budgets') ||
        /\.(pdf|docx?|xlsx?|zip|rar)(\?|$)/i.test(url) ||
        /descargar|download/i.test(linkText);

      if (isDownloadable) {
        // Extract file name from link text or URL
        let fileName = linkText;
        const urlFileName = this.extractFileNameFromUrl(url);
        if (urlFileName) {
          fileName = urlFileName;
        }

        // Determine MIME type
        const mimeType = this.getMimeTypeFromUrl(url) || this.getMimeTypeFromText(linkText);

        // Extract quotation number if present
        const quotationMatch = content.match(/cotizaci[oó]n\s*#?(\d+)/i) || linkText.match(/(\d+)/);
        const internalCode = quotationMatch ? parseInt(quotationMatch[1], 10) : undefined;

        // Get the message (text before the link)
        const linkIndex = content.indexOf(match[0]);
        let message = content.substring(0, linkIndex).trim();
        // Clean up the message
        message = message.replace(/:\s*$/, '').trim();
        if (!message) {
          message = 'Archivo listo para descargar';
        }

        // Clean content is only the text AFTER the link
        const afterLinkIndex = linkIndex + match[0].length;
        const cleanContent = content.substring(afterLinkIndex).trim();

        return {
          fileResponse: {
            type: 'file_download',
            fileName,
            url,
            mimeType,
            message,
            internalCode
          },
          cleanContent
        };
      }
    }

    return null;
  }

  /**
   * Extract file name from URL
   */
  private extractFileNameFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const segments = pathname.split('/');
      const lastSegment = segments[segments.length - 1];

      if (lastSegment && lastSegment.includes('.')) {
        // Decode URL encoding and clean up
        return decodeURIComponent(lastSegment).replace(/_/g, ' ');
      }
    } catch {
      // Invalid URL
    }
    return null;
  }

  /**
   * Get MIME type from URL extension
   */
  private getMimeTypeFromUrl(url: string): string {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('.pdf')) return 'application/pdf';
    if (lowerUrl.includes('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (lowerUrl.includes('.doc')) return 'application/msword';
    if (lowerUrl.includes('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (lowerUrl.includes('.xls')) return 'application/vnd.ms-excel';
    if (lowerUrl.includes('.zip')) return 'application/zip';
    return 'application/octet-stream';
  }

  /**
   * Get MIME type from link text
   */
  private getMimeTypeFromText(text: string): string {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('pdf')) return 'application/pdf';
    if (lowerText.includes('word') || lowerText.includes('doc')) return 'application/msword';
    if (lowerText.includes('excel') || lowerText.includes('xls')) return 'application/vnd.ms-excel';
    if (lowerText.includes('zip')) return 'application/zip';
    return 'application/octet-stream';
  }

  /**
   * Process message content and extract file response if present
   */
  private processMessageContent(content: string): { content: string; fileResponse?: ChatFileResponse } {
    // First try JSON format
    const jsonResponse = this.parseJsonFileResponse(content);
    if (jsonResponse) {
      return {
        content: jsonResponse.message || content,
        fileResponse: jsonResponse.type === 'file_download' ? jsonResponse : undefined
      };
    }

    // Then try Markdown format
    const markdownResponse = this.parseMarkdownFileResponse(content);
    if (markdownResponse) {
      return {
        content: markdownResponse.cleanContent,
        fileResponse: markdownResponse.fileResponse
      };
    }

    return { content };
  }

  /**
   * Wait for connection to be established
   */
  public async waitForConnection(timeoutMs: number = 10000): Promise<void> {
    if (!this.hubConnection) {
      throw new Error('Hub connection not initialized');
    }

    if (this.hubConnection.state === HubConnectionState.Connected) {
      return;
    }

    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const check = () => {
        if (this.hubConnection?.state === HubConnectionState.Connected) {
          resolve();
        } else if (Date.now() - startTime > timeoutMs) {
          reject(new Error('Connection timeout'));
        } else {
          setTimeout(check, 100);
        }
      };

      check();
    });
  }

  /**
   * Send message with automatic reconnection
   */
  public async sendMessage(message: string): Promise<void> {
    // Try to reconnect if disconnected
    if (!this.isConnected()) {
      console.warn('Not connected, attempting to reconnect...');
      try {
        await this.reconnect();
        await this.waitForConnection(5000);
      } catch (error) {
        console.error('Failed to reconnect:', error);
        return;
      }
    }

    if (this.hubConnection && this.isConnected()) {
      const chatRequest = {
        Message: message
      };

      const userMessage: ChatMessage = {
        id: new Date().getTime().toString(),
        sender: 'user',
        content: message,
        timestamp: new Date().toISOString(),
        isStreaming: false
      };
      const current = this.messagesSubject.value;
      this.messagesSubject.next([...current, userMessage]);

      try {
        await this.hubConnection.invoke('SendMessageStreaming', chatRequest);
      } catch (err) {
        console.error('SendMessageStreaming Error:', err);
        this.botTypingSubject.next(false);
        // Schedule reconnect on error
        this.scheduleReconnect();
      }
    }
  }

  /**
   * Get chat history
   */
  public async getHistory(): Promise<void> {
    try {
      await this.waitForConnection();
      if (this.hubConnection && this.isConnected()) {
        await this.hubConnection.invoke('GetHistory');
      }
    } catch (err) {
      console.error('GetHistory Error:', err);
    }
  }

  /**
   * Clear chat history
   */
  public async clearHistory(): Promise<void> {
    try {
      await this.waitForConnection();
      if (this.hubConnection && this.isConnected()) {
        await this.hubConnection.invoke('ClearHistory');
      }
    } catch (err) {
      console.error('ClearHistory Error:', err);
    }
  }
}
