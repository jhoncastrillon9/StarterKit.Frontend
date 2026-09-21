import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { RouterModule } from '@angular/router';
import { environment } from 'src/environment';

interface Subscription {
  planName: string;
  amountCop: number;
  billingMonths: number;
  status: string;
  startDate: string;
  endDate: string;
  daysToExpiry: number;
  totalPaidCop: number;
  lastPaymentAt?: string | null;
}

interface PaymentInstructions {
  bankName?: string | null;
  accountType?: string | null;
  accountNumber?: string | null;
  accountHolder?: string | null;
  holderDocument?: string | null;
  contactEmail?: string | null;
  contactWhatsapp?: string | null;
  notes?: string | null;
}

interface Payment {
  paidAt: string;
  amountCop: number;
  method: string;
  reference?: string | null;
  coversMonths: number;
}

interface MySubscription {
  subscription: Subscription | null;
  paymentInstructions: PaymentInstructions | null;
  payments: Payment[];
}

/**
 * Suscripción de la empresa del usuario.
 *
 * Lo primero que responde es "¿hasta cuándo puedo trabajar?", que es lo que
 * preocupa. Las instrucciones de pago vienen del servidor y no escritas aquí:
 * una cuenta bancaria en el frontend obliga a desplegar para cambiarla.
 */
@Component({
  selector: 'app-my-subscription',
  standalone: true,
  imports: [CommonModule, RouterModule],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './my-subscription.component.html',
  styleUrls: ['./my-subscription.component.scss'],
})
export class MySubscriptionComponent implements OnInit {
  data: MySubscription | null = null;
  loading = true;
  error = '';
  copied = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    const headers = new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('token')}` });
    this.http.get<MySubscription>(`${environment.apiUrl}/api/MySubscription`, { headers }).subscribe({
      next: d => { this.data = d; this.loading = false; },
      error: () => {
        this.loading = false;
        this.error = 'No pudimos cargar tu suscripción. Vuelve a intentarlo en un momento.';
      },
    });
  }

  get sub(): Subscription | null {
    return this.data?.subscription ?? null;
  }

  /** Qué decirle al usuario según su estado. El titular es la conclusión, no el dato. */
  get headline(): string {
    const s = this.sub;
    if (!s) return 'Sin suscripción activa';
    switch (s.status) {
      case 'Trial':
        return s.daysToExpiry >= 0
          ? `Te quedan ${s.daysToExpiry} días de prueba`
          : 'Tu período de prueba terminó';
      case 'Active':
        return s.daysToExpiry <= 7
          ? `Tu plan vence en ${s.daysToExpiry} ${s.daysToExpiry === 1 ? 'día' : 'días'}`
          : 'Tu cuenta está al día';
      case 'PastDue':
        return 'Tu plan venció: registra el pago para no perder el acceso';
      case 'Blocked':
        return 'Tu acceso está suspendido por falta de pago';
      case 'Cancelled':
        return 'Tu suscripción está cancelada';
      default:
        return 'Estado de tu suscripción';
    }
  }

  get tone(): 'ok' | 'warn' | 'bad' {
    const s = this.sub;
    if (!s) return 'warn';
    if (s.status === 'Blocked' || s.status === 'Cancelled') return 'bad';
    if (s.status === 'PastDue' || s.daysToExpiry <= 7) return 'warn';
    return 'ok';
  }

  cop(v: number | null | undefined): string {
    return '$ ' + (v ?? 0).toLocaleString('es-CO');
  }

  fecha(v?: string | null): string {
    return v ? new Date(v).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
  }

  /** Copiar el número de cuenta ahorra el error de transcribirlo a mano. */
  copy(text: string | null | undefined, label: string): void {
    if (!text) return;
    navigator.clipboard?.writeText(text).then(() => {
      this.copied = label;
      setTimeout(() => (this.copied = ''), 2500);
    }).catch(() => { /* si el navegador no deja, el numero sigue visible */ });
  }
}
