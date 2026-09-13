import { BudgetModel } from '../../budgets/models/budget.Model';
import { CustomerModel } from '../../customers/models/customer.Model';
import { PaymentModel } from '../../payments/models/payment.Model';

/**
 * Cálculos de cartera del estado de cuenta.
 *
 * Funciones puras, sin dependencias de Angular ni de HTTP: la pantalla de estado
 * de cuenta, el dashboard y el informe comparten exactamente la misma aritmética.
 *
 * ALCANCE: solo lo que se puede calcular con los datos que la pantalla ya tiene
 * en el navegador — las cotizaciones (todas, de `BudgetService.get()`) y los
 * movimientos del cliente seleccionado (`PaymentService.getByCustomerId`).
 *
 * Los agregados de toda la empresa (cartera total, reparto global por tramo,
 * recaudo por mes) NO se calculan aquí: los entrega el backend en un endpoint
 * propio. Motivo documentado: la única fuente multi-cliente de pagos que existe
 * hoy, `GET /api/payment/payment`, filtra las cotizaciones por el flag legacy
 * `IsInvoice` en vez de por `estado`, así que no cubre el mismo universo que el
 * estado de cuenta. No añadas aquí ese cálculo en cliente.
 */

// --------------------------------------------------------------- tipos y constantes

/** Tipo de movimiento que descuenta saldo de una cotización facturada. */
export type MovementKind = 'Abono' | 'Ajuste';

/** Solo las cotizaciones en este estado se cobran en el estado de cuenta. */
export const BILLED_STATUS = 'facturada';

/**
 * Tolerancia en pesos por debajo de la cual una cotización se da por saldada.
 * Absorbe los redondeos del total calculado en el backend (BudgetDTO.GetTotal()).
 */
export const SETTLED_TOLERANCE = 0.5;

/**
 * Tramos de antigüedad, en días desde `budget.date`.
 *
 * No es mora ni vencimiento: en CotizaConstructor una cotización no tiene fecha
 * de vencimiento. Lo único medible es cuánto tiempo lleva sin cobrarse.
 */
export type AgingBucket = '0-30' | '31-60' | '61-90' | '+90';

/** Los tramos en orden, del más reciente al más antiguo. */
export const AGING_BUCKETS: readonly AgingBucket[] = ['0-30', '31-60', '61-90', '+90'];

/** Etiquetas de cara al usuario, en español. */
export const AGING_BUCKET_LABELS: Readonly<Record<AgingBucket, string>> = {
  '0-30': '0 a 30 días',
  '31-60': '31 a 60 días',
  '61-90': '61 a 90 días',
  '+90': 'Más de 90 días',
};

/** Movimientos (abonos y ajustes) indexados por cotización. */
export type MovementIndex = ReadonlyMap<number, PaymentModel[]>;

/** Saldo acumulado en cada tramo de antigüedad. */
export type AgingBreakdown = Record<AgingBucket, number>;

// ------------------------------------------------------------------ indexación

/**
 * Indexa movimientos por cotización.
 *
 * Los movimientos sin `budgetId` se descartan: no se pueden imputar a ninguna
 * factura y contarlos en los totales inflaría lo cobrado. Es el comportamiento
 * que ya tenía la pantalla.
 */
export function indexMovementsByBudget(payments: readonly PaymentModel[]): Map<number, PaymentModel[]> {
  const map = new Map<number, PaymentModel[]>();
  for (const payment of payments ?? []) {
    if (!payment?.budgetId) continue;
    const list = map.get(payment.budgetId) ?? [];
    list.push(payment);
    map.set(payment.budgetId, list);
  }
  return map;
}

/** Una cotización entra en el estado de cuenta solo si está facturada. */
export function isBilled(budget: BudgetModel): boolean {
  return (budget?.estado ?? '').trim().toLowerCase() === BILLED_STATUS;
}

/** Cotizaciones facturadas de un cliente, de la más reciente a la más antigua. */
export function billedBudgetsOf(budgets: readonly BudgetModel[], customerId: number): BudgetModel[] {
  return (budgets ?? [])
    .filter(b => b.customerId === customerId && isBilled(b))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// -------------------------------------------------------- movimientos y saldos

/** Un movimiento es ajuste si su tipo menciona ajuste/retención/impuesto. */
export function kindOf(movement: PaymentModel): MovementKind {
  return /ajust|retenc|impuest/i.test(movement.paymentType ?? '') ? 'Ajuste' : 'Abono';
}

export function sumMovements(movements: readonly PaymentModel[]): number {
  return (movements ?? []).reduce((acc, m) => acc + (Number(m.amountPaid) || 0), 0);
}

export function movementsFor(index: MovementIndex, budgetId: number): PaymentModel[] {
  return index?.get(budgetId) ?? [];
}

export function abonosFor(index: MovementIndex, budgetId: number): number {
  return sumMovements(movementsFor(index, budgetId).filter(m => kindOf(m) === 'Abono'));
}

export function ajustesFor(index: MovementIndex, budgetId: number): number {
  return sumMovements(movementsFor(index, budgetId).filter(m => kindOf(m) === 'Ajuste'));
}

/** Lo aplicado a la factura: abonos reales + ajustes (impuestos retenidos). */
export function appliedFor(index: MovementIndex, budgetId: number): number {
  return abonosFor(index, budgetId) + ajustesFor(index, budgetId);
}

export function saldoFor(budget: BudgetModel, index: MovementIndex): number {
  return (budget.total ?? 0) - appliedFor(index, budget.budgetId);
}

/** Porcentaje cubierto de la factura, para la barra de progreso. */
export function progressFor(budget: BudgetModel, index: MovementIndex): number {
  const total = budget.total ?? 0;
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, (appliedFor(index, budget.budgetId) / total) * 100));
}

export function isSettled(budget: BudgetModel, index: MovementIndex): boolean {
  return saldoFor(budget, index) <= SETTLED_TOLERANCE;
}

// ---------------------------------------------------------------------- totales

export function totalFacturado(budgets: readonly BudgetModel[]): number {
  return (budgets ?? []).reduce((acc, b) => acc + (b.total ?? 0), 0);
}

export function totalAbonos(budgets: readonly BudgetModel[], index: MovementIndex): number {
  return (budgets ?? []).reduce((acc, b) => acc + abonosFor(index, b.budgetId), 0);
}

export function totalAjustes(budgets: readonly BudgetModel[], index: MovementIndex): number {
  return (budgets ?? []).reduce((acc, b) => acc + ajustesFor(index, b.budgetId), 0);
}

/** Total adeudado real: facturado menos abonos y ajustes. */
export function totalSaldo(budgets: readonly BudgetModel[], index: MovementIndex): number {
  return totalFacturado(budgets) - totalAbonos(budgets, index) - totalAjustes(budgets, index);
}

export function settledCount(budgets: readonly BudgetModel[], index: MovementIndex): number {
  return (budgets ?? []).filter(b => isSettled(b, index)).length;
}

// -------------------------------------------------------------------- antigüedad

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Medianoche local: la antigüedad se cuenta en días de calendario, no en horas. */
function startOfDay(value: Date | string): number {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * Días transcurridos desde `budget.date` hasta hoy. Nunca negativo: una
 * cotización con fecha futura cuenta como de hoy (0 días).
 */
export function agingDays(budget: BudgetModel, now: Date = new Date()): number {
  if (!budget?.date) return 0;
  const from = startOfDay(budget.date);
  if (!Number.isFinite(from)) return 0;
  return Math.max(0, Math.round((startOfDay(now) - from) / MS_PER_DAY));
}

/** Tramo al que pertenece un número de días de antigüedad. */
export function agingBucketOfDays(days: number): AgingBucket {
  if (days <= 30) return '0-30';
  if (days <= 60) return '31-60';
  if (days <= 90) return '61-90';
  return '+90';
}

/** Tramo de antigüedad de una cotización. */
export function agingBucketOf(budget: BudgetModel, now: Date = new Date()): AgingBucket {
  return agingBucketOfDays(agingDays(budget, now));
}

/** Un desglose por tramo con todos los tramos a cero. */
export function emptyAgingBreakdown(): AgingBreakdown {
  return { '0-30': 0, '31-60': 0, '61-90': 0, '+90': 0 };
}

/**
 * Saldo acumulado por tramo de antigüedad.
 *
 * Solo cuentan las cotizaciones con saldo pendiente: lo ya cobrado no envejece.
 */
export function saldoByAgingBucket(
  budgets: readonly BudgetModel[],
  index: MovementIndex,
  now: Date = new Date()
): AgingBreakdown {
  const breakdown = emptyAgingBreakdown();
  for (const budget of budgets ?? []) {
    if (isSettled(budget, index)) continue;
    breakdown[agingBucketOf(budget, now)] += saldoFor(budget, index);
  }
  return breakdown;
}

/**
 * Tramo del saldo pendiente más antiguo del conjunto, o `null` si no hay saldo.
 * Es el tramo con el que se etiqueta a un cliente.
 */
export function oldestPendingBucket(
  budgets: readonly BudgetModel[],
  index: MovementIndex,
  now: Date = new Date()
): AgingBucket | null {
  let oldest = -1;
  for (const budget of budgets ?? []) {
    if (isSettled(budget, index)) continue;
    oldest = Math.max(oldest, agingDays(budget, now));
  }
  return oldest < 0 ? null : agingBucketOfDays(oldest);
}

// -------------------------------------------------------- agregados de cartera

/** Cartera de un cliente. */
export interface CustomerCartera {
  customerId: number;
  customerName: string;
  /** Suma de `budget.total` de sus cotizaciones facturadas. */
  facturado: number;
  abonos: number;
  ajustes: number;
  /** facturado − abonos − ajustes. */
  saldo: number;
  /** Cotizaciones facturadas con saldo pendiente. */
  pendingCount: number;
  /** Total de cotizaciones facturadas. */
  billedCount: number;
  /** Tramo del saldo pendiente más antiguo; `null` si está al día. */
  oldestBucket: AgingBucket | null;
  /** Días de antigüedad del saldo pendiente más antiguo; 0 si está al día. */
  oldestDays: number;
}

/** Cartera de un cliente a partir de sus cotizaciones ya filtradas. */
export function carteraOfCustomer(
  customer: CustomerModel,
  budgets: readonly BudgetModel[],
  index: MovementIndex,
  now: Date = new Date()
): CustomerCartera {
  const billed = (budgets ?? []).filter(b => b.customerId === customer.customerId && isBilled(b));
  const pending = billed.filter(b => !isSettled(b, index));
  const abonos = totalAbonos(billed, index);
  const ajustes = totalAjustes(billed, index);
  const facturado = totalFacturado(billed);
  const oldestDays = pending.reduce((acc, b) => Math.max(acc, agingDays(b, now)), 0);

  return {
    customerId: customer.customerId,
    customerName: customer.customerName ?? '',
    facturado,
    abonos,
    ajustes,
    saldo: facturado - abonos - ajustes,
    pendingCount: pending.length,
    billedCount: billed.length,
    oldestBucket: pending.length ? agingBucketOfDays(oldestDays) : null,
    oldestDays: pending.length ? oldestDays : 0,
  };
}

