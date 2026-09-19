import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environment';

export interface AdminSubscription {
  subscriptionId: number;
  companyId: number;
  planName: string;
  amountCop: number;
  billingMonths: number;
  status: string;
  startDate: string;
  endDate: string;
  notes?: string | null;
  daysToExpiry: number;
  totalPaidCop: number;
  lastPaymentAt?: string | null;
}

export interface AdminCompany {
  companyId: number;
  companyName: string;
  document: string;
  email: string;
  status?: string | null;
  statusReason?: string | null;
  createdAt?: string | null;
  userCount: number;
  lastLoginAt?: string | null;
  budgetCount: number;
  invoiceCount: number;
  subscription?: AdminSubscription | null;
  hasAccess: boolean;
}

export interface AdminUser {
  userId: number;
  companyId: number;
  companyName: string;
  userName: string;
  email: string;
  role: string;
  lastLoginAt?: string | null;
  createdAt?: string | null;
}

export interface AdminPayment {
  subscriptionPaymentId: number;
  subscriptionId: number;
  companyId: number;
  companyName: string;
  paidAt: string;
  amountCop: number;
  method: string;
  reference?: string | null;
  proofUrl?: string | null;
  notes?: string | null;
  coversMonths: number;
}

export interface AdminReminder {
  companyId: number;
  companyName: string;
  kind: 'expiring' | 'overdue' | 'blocked';
  message: string;
  daysToExpiry: number;
  endDate: string;
}

export interface AdminDashboard {
  totalCompanies: number;
  activeCompanies: number;
  blockedCompanies: number;
  suspendedCompanies: number;
  trialSubscriptions: number;
  activeSubscriptions: number;
  pastDueSubscriptions: number;
  blockedSubscriptions: number;
  expiringSoon: number;
  newCompaniesThisMonth: number;
  revenueThisMonthCop: number;
  revenueTotalCop: number;
  pendingCop: number;
  totalUsers: number;
  totalBudgets: number;
  totalInvoices: number;
  reminders: AdminReminder[];
}

@Injectable({ providedIn: 'root' })
export class PlatformAdminService {
  private readonly apiUrl = `${environment.apiUrl}/api/admin`;

  constructor(private http: HttpClient) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    });
  }

  dashboard(): Observable<AdminDashboard> {
    return this.http.get<AdminDashboard>(`${this.apiUrl}/dashboard`, { headers: this.headers() });
  }

  companies(search?: string, status?: string): Observable<AdminCompany[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (status) params = params.set('status', status);
    return this.http.get<AdminCompany[]>(`${this.apiUrl}/companies`, { headers: this.headers(), params });
  }

  changeStatus(companyId: number, status: string, reason?: string): Observable<AdminCompany> {
    return this.http.put<AdminCompany>(`${this.apiUrl}/companies/status`,
      { companyId, status, reason }, { headers: this.headers() });
  }

  users(companyId?: number, search?: string): Observable<AdminUser[]> {
    let params = new HttpParams();
    if (companyId) params = params.set('companyId', String(companyId));
    if (search) params = params.set('search', search);
    return this.http.get<AdminUser[]>(`${this.apiUrl}/users`, { headers: this.headers(), params });
  }

  subscriptions(status?: string): Observable<AdminSubscription[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<AdminSubscription[]>(`${this.apiUrl}/subscriptions`, { headers: this.headers(), params });
  }

  payments(companyId?: number): Observable<AdminPayment[]> {
    let params = new HttpParams();
    if (companyId) params = params.set('companyId', String(companyId));
    return this.http.get<AdminPayment[]>(`${this.apiUrl}/payments`, { headers: this.headers(), params });
  }

  registerPayment(body: {
    companyId: number; paidAt?: string; amountCop: number; method: string;
    reference?: string; proofUrl?: string; notes?: string; coversMonths: number;
  }): Observable<AdminSubscription> {
    return this.http.post<AdminSubscription>(`${this.apiUrl}/payments`, body, { headers: this.headers() });
  }
}
