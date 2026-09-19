import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  AdminCompany, AdminDashboard, AdminPayment, AdminSubscription, AdminUser,
  PlatformAdminService,
} from './services/platform-admin.service';

type Tab = 'panel' | 'empresas' | 'usuarios' | 'pagos';

/**
 * Panel de administración de la plataforma.
 *
 * Es una herramienta de trabajo, no un informe: lo primero que se ve es lo que
 * hay que atender hoy (vencidas, bloqueadas, por vencer), y solo después las
 * cifras. Un panel que empieza por "empresas totales" obliga a buscar el problema.
 */
@Component({
  selector: 'app-platform-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './platform-admin.component.html',
  styleUrls: ['./platform-admin.component.scss'],
})
export class PlatformAdminComponent implements OnInit {
  tab: Tab = 'panel';

  dashboard: AdminDashboard | null = null;
  companies: AdminCompany[] = [];
  users: AdminUser[] = [];
  payments: AdminPayment[] = [];

  loading = false;
  error = '';

  companySearch = '';
  companyStatus = '';
  userSearch = '';

  /** Empresa sobre la que se está actuando en el panel lateral. */
  selected: AdminCompany | null = null;

  /** Formulario de cambio de estado. */
  statusForm = { status: '', reason: '' };

  /** Formulario de registro de pago. */
  paymentForm = {
    amountCop: 120000,
    paidAt: new Date().toISOString().slice(0, 10),
    method: 'Transferencia',
    reference: '',
    notes: '',
    coversMonths: 1,
  };

  saving = false;
  message = '';

  readonly tabs: { id: Tab; label: string }[] = [
    { id: 'panel', label: 'Panel' },
    { id: 'empresas', label: 'Empresas' },
    { id: 'usuarios', label: 'Usuarios' },
    { id: 'pagos', label: 'Pagos' },
  ];

  readonly companyStatuses = [
    { value: '', label: 'Todas' },
    { value: 'noAccess', label: 'Sin acceso' },
    { value: 'Active', label: 'Activas' },
    { value: 'Suspended', label: 'Suspendidas' },
    { value: 'Blocked', label: 'Bloqueadas' },
  ];

  constructor(private service: PlatformAdminService) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  setTab(tab: Tab): void {
    this.tab = tab;
    this.message = '';
    if (tab === 'panel' && !this.dashboard) this.loadDashboard();
    if (tab === 'empresas' && this.companies.length === 0) this.loadCompanies();
    if (tab === 'usuarios' && this.users.length === 0) this.loadUsers();
    if (tab === 'pagos' && this.payments.length === 0) this.loadPayments();
  }

  // ------------------------------------------------------------- Cargas

  loadDashboard(): void {
    this.loading = true;
    this.service.dashboard().subscribe({
      next: d => { this.dashboard = d; this.loading = false; },
      error: e => this.fail(e),
    });
  }

  loadCompanies(): void {
    this.loading = true;
    this.service.companies(this.companySearch, this.companyStatus).subscribe({
      next: c => { this.companies = c; this.loading = false; },
      error: e => this.fail(e),
    });
  }

  loadUsers(): void {
    this.loading = true;
    this.service.users(undefined, this.userSearch).subscribe({
      next: u => { this.users = u; this.loading = false; },
      error: e => this.fail(e),
    });
  }

  loadPayments(): void {
    this.loading = true;
    this.service.payments().subscribe({
      next: p => { this.payments = p; this.loading = false; },
      error: e => this.fail(e),
    });
  }

  private fail(e: any): void {
    this.loading = false;
    this.error = e?.error?.error || e?.error?.message
      || 'No se pudo cargar. Comprueba que tu cuenta tenga rol de administrador de plataforma.';
  }

  // ------------------------------------------------------------- Acciones

  select(company: AdminCompany): void {
    this.selected = company;
    this.statusForm = { status: company.status || 'Active', reason: company.statusReason || '' };
    this.paymentForm.amountCop = company.subscription?.amountCop ?? 120000;
    this.message = '';
  }

  closePanel(): void {
    this.selected = null;
  }

  changeStatus(): void {
    if (!this.selected) return;
    this.saving = true;
    this.service.changeStatus(this.selected.companyId, this.statusForm.status, this.statusForm.reason).subscribe({
      next: c => {
        this.saving = false;
        this.replaceCompany(c);
        this.selected = c;
        this.message = `Estado de ${c.companyName} actualizado.`;
        this.dashboard = null;
      },
      error: e => {
        this.saving = false;
        this.message = e?.error?.error || 'No se pudo cambiar el estado.';
      },
    });
  }

  registerPayment(): void {
    if (!this.selected) return;
    this.saving = true;
    this.service.registerPayment({
      companyId: this.selected.companyId,
      paidAt: this.paymentForm.paidAt,
      amountCop: this.paymentForm.amountCop,
      method: this.paymentForm.method,
      reference: this.paymentForm.reference || undefined,
      notes: this.paymentForm.notes || undefined,
      coversMonths: this.paymentForm.coversMonths,
    }).subscribe({
      next: (sub: AdminSubscription) => {
        this.saving = false;
        this.message = `Pago registrado. Vence el ${new Date(sub.endDate).toLocaleDateString('es-CO')}.`;
        if (this.selected) this.selected = { ...this.selected, subscription: sub, hasAccess: true };
        this.payments = [];
        this.dashboard = null;
        this.loadCompanies();
      },
      error: e => {
        this.saving = false;
        this.message = e?.error?.error || 'No se pudo registrar el pago.';
      },
    });
  }

  private replaceCompany(updated: AdminCompany): void {
    this.companies = this.companies.map(c => c.companyId === updated.companyId ? updated : c);
  }

  // ------------------------------------------------------------- Presentación

  /** Texto en español del estado de una suscripción. */
  subLabel(status?: string | null): string {
    switch (status) {
      case 'Trial': return 'En prueba';
      case 'Active': return 'Al día';
      case 'PastDue': return 'Vencida';
      case 'Blocked': return 'Bloqueada';
      case 'Cancelled': return 'Cancelada';
      default: return 'Sin suscripción';
    }
  }

  companyLabel(status?: string | null): string {
    switch (status) {
      case 'Suspended': return 'Suspendida';
      case 'Blocked': return 'Bloqueada';
      default: return 'Activa';
    }
  }

  /** Severidad para pintar: el color dice qué necesita atención. */
  severity(company: AdminCompany): 'ok' | 'warn' | 'bad' {
    if (!company.hasAccess) return 'bad';
    const dias = company.subscription?.daysToExpiry ?? 999;
    if (dias < 0) return 'bad';
    if (dias <= 7) return 'warn';
    return 'ok';
  }

  cop(value: number | null | undefined): string {
    return '$ ' + (value ?? 0).toLocaleString('es-CO');
  }

  fecha(value?: string | null): string {
    return value ? new Date(value).toLocaleDateString('es-CO') : '—';
  }

  /** Antigüedad legible del último acceso; lo que se quiere saber es si está vivo. */
  desde(value?: string | null): string {
    if (!value) return 'Nunca';
    const dias = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
    if (dias <= 0) return 'Hoy';
    if (dias === 1) return 'Ayer';
    if (dias < 30) return `Hace ${dias} días`;
    const meses = Math.floor(dias / 30);
    return meses === 1 ? 'Hace un mes' : `Hace ${meses} meses`;
  }
}
