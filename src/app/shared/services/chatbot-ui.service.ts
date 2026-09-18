import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

/**
 * Ambito sobre el que el usuario abrio el chat. Viaja al backend para que el
 * agente sepa sobre que esta trabajando sin tener que deducirlo del texto.
 *
 * - `budget`: el usuario esta editando una cotizacion concreta. Pedir "agrega
 *   20 sacos de cemento" significa anadir un ITEM a esa cotizacion.
 * - `products`: el usuario esta en el catalogo. Ahi si se crean PRODUCTOS.
 * - `budgets`: listado de cotizaciones, sin una cotizacion concreta abierta.
 */
export interface ChatContext {
  scope: 'budget' | 'budgets' | 'products';
  /** Id interno de la cotizacion en curso (solo scope 'budget'). */
  budgetId?: number;
  /** Numero de cotizacion que ve el usuario (solo scope 'budget'). */
  internalCode?: number;
  /** Nombre de la obra, para poder mostrarlo en la cabecera del chat. */
  label?: string;
}

export interface ChatOpenRequest {
  /** Texto que se deja escrito en el input para que el usuario lo revise. */
  prefill?: string;
  context?: ChatContext;
}

/**
 * Punto unico para abrir el chat de IA desde cualquier modulo.
 *
 * Existe para que los botones "Crear con IA" / "Agregar desde IA" reutilicen el
 * chat que ya vive en el layout en lugar de montar cada uno su propia
 * conversacion. El chat es el unico suscriptor de `open$`.
 */
@Injectable({ providedIn: 'root' })
export class ChatbotUiService {
  private readonly openSubject = new Subject<ChatOpenRequest>();
  /** Emite cada vez que un modulo pide abrir el chat. */
  readonly open$ = this.openSubject.asObservable();

  private readonly contextSubject = new BehaviorSubject<ChatContext | null>(null);
  /** Contexto activo; lo lee el servicio de SignalR al enviar cada mensaje. */
  readonly context$ = this.contextSubject.asObservable();

  get context(): ChatContext | null {
    return this.contextSubject.value;
  }

  /** Abre el chat, opcionalmente con texto sugerido y un contexto de trabajo. */
  open(request: ChatOpenRequest = {}): void {
    if (request.context !== undefined) {
      this.contextSubject.next(request.context);
    }
    this.openSubject.next(request);
  }

  /** Fija el contexto sin abrir el chat (p. ej. al entrar a editar una cotizacion). */
  setContext(context: ChatContext | null): void {
    this.contextSubject.next(context);
  }

  clearContext(): void {
    this.contextSubject.next(null);
  }
}
