/**
 * Contrato de GET /api/report/account-statement/dashboard.
 *
 * Los agregados los calcula el backend; el dashboard no calcula nada global.
 * Garantías del contrato, en las que se apoya este componente:
 *  - `aging` trae SIEMPRE los cuatro tramos, en orden, aunque valgan cero.
 *  - `collectionsByMonth` trae SIEMPRE 12 meses, del más antiguo al más reciente.
 *  - `customers` solo incluye clientes con alguna cotización facturada, ya
 *    ordenados por `outstanding` de mayor a menor.
 */

/** Tramo de antigüedad. NO es mora: estas cotizaciones no tienen vencimiento pactado. */
export type PortfolioAgingBucket = '0-30' | '31-60' | '61-90' | '+90';

export const PORTFOLIO_AGING_BUCKETS: readonly PortfolioAgingBucket[] = ['0-30', '31-60', '61-90', '+90'];

/** Etiqueta larga, para los ejes de los gráficos. */
export const PORTFOLIO_AGING_LABELS: Readonly<Record<PortfolioAgingBucket, string>> = {
  '0-30': '0 – 30 días',
  '31-60': '31 – 60 días',
  '61-90': '61 – 90 días',
  '+90': 'Más de 90 días',
};

/** Etiqueta corta, para leyendas y la barra apilada de cada fila. */
export const PORTFOLIO_AGING_SHORT_LABELS: Readonly<Record<PortfolioAgingBucket, string>> = {
  '0-30': '0–30',
  '31-60': '31–60',
  '61-90': '61–90',
  '+90': '+90',
};

export interface PortfolioTotals {
  billed: number;
  collected: number;
  adjustments: number;
  outstanding: number;
  customersWithBalance: number;
  budgetsWithBalance: number;
}

export interface PortfolioAgingSlice {
  bucket: PortfolioAgingBucket;
  amount: number;
  count: number;
}

export interface PortfolioMonthlyCollection {
  year: number;
  month: number;
  amount: number;
}

export interface PortfolioCustomerAgingSlice {
  bucket: PortfolioAgingBucket;
  amount: number;
}

export interface PortfolioCustomer {
  customerId: number;
  customerName: string;
  billed: number;
  collected: number;
  adjustments: number;
  outstanding: number;
  budgetsWithBalance: number;
  oldestBucket: PortfolioAgingBucket | null;
  aging: PortfolioCustomerAgingSlice[];
}

export interface PortfolioDashboardResponse {
  totals: PortfolioTotals;
  aging: PortfolioAgingSlice[];
  collectionsByMonth: PortfolioMonthlyCollection[];
  customers: PortfolioCustomer[];
}

/** Un segmento ya resuelto a porcentaje, para la barra apilada de la fila. */
export interface PortfolioAgingSegment {
  bucket: PortfolioAgingBucket;
  amount: number;
  percent: number;
  color: string;
}

/** Fila del ranking: el cliente del contrato más lo precalculado para pintarla. */
export interface PortfolioCustomerRow extends PortfolioCustomer {
  segments: PortfolioAgingSegment[];
  oldestLabel: string;
}
