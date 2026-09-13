import { ChangeDetectionStrategy, Component, OnInit, computed, inject, output, signal } from '@angular/core';
import type { ChartData, ChartOptions } from 'chart.js';
import { DataTableColumn } from 'src/app/shared/ui/data-table/data-table.types';
import { PortfolioDashboardService } from './portfolio-dashboard.service';
import {
  PORTFOLIO_AGING_BUCKETS,
  PORTFOLIO_AGING_LABELS,
  PORTFOLIO_AGING_SHORT_LABELS,
  PortfolioAgingBucket,
  PortfolioAgingSegment,
  PortfolioCustomer,
  PortfolioCustomerRow,
  PortfolioDashboardResponse,
} from './portfolio-dashboard.models';

/**
 * Paleta de los gráficos. Los valores son los mismos de
 * `src/app/shared/ui/_dc-tokens.scss` ($dc-primary, $dc-primary-light, $dc-adjust,
 * $dc-debt, $dc-credit, $dc-info): Chart.js pinta sobre canvas y no puede leer
 * variables de Sass, así que se espejan aquí en un único sitio.
 */
const PALETTE = {
  primary: '#6d28d9',
  primaryLight: '#a78bfa',
  adjust: '#b45309',
  debt: '#c0392b',
  credit: '#15703f',
  info: '#12a0d8',
  ink: '#1f1b2e',
  muted: '#8b85a1',
  grid: '#f2f1f7',
  axis: '#ebe9f3',
} as const;

/** Un color por tramo de antigüedad, del más reciente al más antiguo. */
const BUCKET_COLORS: Readonly<Record<PortfolioAgingBucket, string>> = {
  '0-30': PALETTE.primary,
  '31-60': PALETTE.primaryLight,
  '61-90': PALETTE.adjust,
  '+90': PALETTE.debt,
};

const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

@Component({
  selector: 'app-portfolio-dashboard',
  templateUrl: './portfolio-dashboard.component.html',
  styleUrls: ['./portfolio-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioDashboardComponent implements OnInit {
  private service = inject(PortfolioDashboardService);

  // ------------------------------------------------------------ estado
  readonly data = signal<PortfolioDashboardResponse | null>(null);
  readonly loading = signal<boolean>(true);
  readonly loadError = signal<boolean>(false);

  /**
   * Salida pública: el cliente elegido en el ranking. La Task 3 escucha este
   * evento para abrir el detalle del estado de cuenta.
   */
  readonly customerSelected = output<PortfolioCustomerRow>();

  /** Fecha de corte que se muestra en la cabecera. */
  readonly generatedAt = new Date();

  /** Colores para las piezas que los reciben como cadena (kpi-card, leyendas). */
  readonly colors = PALETTE;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.service.getDashboard().subscribe({
      next: (response) => {
        this.data.set(response ?? null);
        this.loading.set(false);
      },
      error: () => {
        this.data.set(null);
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }

  /**
   * Sin ninguna cotización facturada no hay cartera que mostrar: ni cuatro ceros
   * ni dos gráficos en blanco, sino un estado vacío explicado.
   */
  readonly isEmpty = computed(() => {
    const d = this.data();
    if (!d) return false;
    return (d.customers?.length ?? 0) === 0 && (d.totals?.billed ?? 0) === 0;
  });

  readonly ready = computed(() => !this.loading() && !this.loadError() && !!this.data() && !this.isEmpty());

  readonly totals = computed(() => this.data()?.totals ?? null);

  // -------------------------------------------------------------- KPIs

  private share(value: number): string {
    const billed = this.totals()?.billed ?? 0;
    if (!billed) return '';
    return `${((value / billed) * 100).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
  }

  readonly outstandingShare = computed(() => this.share(this.totals()?.outstanding ?? 0));
  readonly collectedShare = computed(() => this.share(this.totals()?.collected ?? 0));
  readonly adjustmentsShare = computed(() => this.share(this.totals()?.adjustments ?? 0));

  readonly billedShare = computed(() => {
    const n = this.totals()?.budgetsWithBalance ?? 0;
    return n === 1 ? '1 cotización con saldo' : `${n} cotizaciones con saldo`;
  });

  readonly customersShare = computed(() => `de ${this.data()?.customers?.length ?? 0}`);

  readonly headerSubtitle = computed(() => {
    const t = this.totals();
    if (!t) return 'Estado de cuenta';
    const clientes = t.customersWithBalance === 1 ? '1 cliente con saldo' : `${t.customersWithBalance} clientes con saldo`;
    const cotizaciones = t.budgetsWithBalance === 1 ? '1 cotización con saldo' : `${t.budgetsWithBalance} cotizaciones con saldo`;
    return `Estado de cuenta · ${cotizaciones} · ${clientes} · al ${this.shortDate(this.generatedAt)}`;
  });

  // ------------------------------------------------ gráfico de antigüedad

  /** Leyenda del gráfico de antigüedad: tramo, color y peso sobre el pendiente. */
  readonly agingLegend = computed(() => {
    const slices = this.data()?.aging ?? [];
    const total = slices.reduce((acc, s) => acc + (s.amount ?? 0), 0);
    return slices.map(s => ({
      bucket: s.bucket,
      label: PORTFOLIO_AGING_SHORT_LABELS[s.bucket] ?? s.bucket,
      color: BUCKET_COLORS[s.bucket] ?? PALETTE.primary,
      percent: total > 0 ? `${((s.amount / total) * 100).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %` : '0 %',
    }));
  });

  readonly agingChartData = computed<ChartData>(() => {
    const slices = this.data()?.aging ?? [];
    return {
      labels: slices.map(s => PORTFOLIO_AGING_LABELS[s.bucket] ?? s.bucket),
      datasets: [
        {
          label: 'Saldo pendiente',
          data: slices.map(s => s.amount ?? 0),
          backgroundColor: slices.map(s => BUCKET_COLORS[s.bucket] ?? PALETTE.primary),
          borderRadius: 4,
          borderSkipped: false,
          maxBarThickness: 62,
        },
      ],
    };
  });

  readonly agingChartOptions = computed<ChartOptions>(() => {
    const slices = this.data()?.aging ?? [];
    const counts = slices.map(s => s.count ?? 0);
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx: any) => {
              const count = counts[ctx.dataIndex] ?? 0;
              const cotizaciones = count === 1 ? '1 cotización' : `${count} cotizaciones`;
              return `${this.money(ctx.parsed.y ?? 0)} · ${cotizaciones}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: PALETTE.axis },
          ticks: { color: '#55506d', font: { family: "'Nunito Sans', system-ui, sans-serif", size: 11, weight: 700 } },
        },
        y: {
          beginAtZero: true,
          grid: { color: PALETTE.grid },
          border: { display: false },
          ticks: {
            color: PALETTE.muted,
            font: { family: "'Nunito Sans', system-ui, sans-serif", size: 10.5, weight: 700 },
            callback: (value: any) => this.compactMoney(Number(value)),
          },
        },
      },
    } as ChartOptions;
  });

  // --------------------------------------------------- gráfico de recaudo

  readonly collectionsRangeLabel = computed(() => {
    const months = this.data()?.collectionsByMonth ?? [];
    if (!months.length) return '';
    const first = months[0];
    const last = months[months.length - 1];
    return `Abonos registrados · ${this.monthLabel(first)} – ${this.monthLabel(last)}`;
  });

  readonly collectionsTotal = computed(() =>
    (this.data()?.collectionsByMonth ?? []).reduce((acc, m) => acc + (m.amount ?? 0), 0)
  );

  readonly collectionsChartData = computed<ChartData>(() => {
    const months = this.data()?.collectionsByMonth ?? [];
    return {
      labels: months.map(m => this.monthLabel(m)),
      datasets: [
        {
          label: 'Recaudo del mes',
          data: months.map(m => m.amount ?? 0),
          borderColor: PALETTE.primary,
          backgroundColor: 'rgba(109, 40, 217, .12)',
          borderWidth: 2.5,
          fill: true,
          tension: 0.35,
          pointRadius: 3.6,
          pointHoverRadius: 5,
          pointBackgroundColor: '#fff',
          pointBorderColor: PALETTE.primary,
          pointBorderWidth: 2.5,
        },
      ],
    };
  });

  readonly collectionsChartOptions = computed<ChartOptions>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx: any) => this.money(ctx.parsed.y ?? 0) } },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { color: PALETTE.axis },
        ticks: { color: '#55506d', font: { family: "'Nunito Sans', system-ui, sans-serif", size: 11, weight: 700 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: PALETTE.grid },
        border: { display: false },
        ticks: {
          color: PALETTE.muted,
          font: { family: "'Nunito Sans', system-ui, sans-serif", size: 10.5, weight: 700 },
          callback: (value: any) => this.compactMoney(Number(value)),
        },
      },
    },
  } as ChartOptions));

  // ------------------------------------------------- ranking de clientes

  readonly tableColumns: DataTableColumn[] = [
    { field: 'customerName', header: 'Cliente', sortable: true, width: '28%', filter: { type: 'text', placeholder: 'Nombre del cliente' } },
    { field: 'budgetsWithBalance', header: 'Cotizaciones', align: 'center', sortable: true, width: '120px' },
    { field: 'billed', header: 'Facturado', align: 'right', sortable: true, width: '150px' },
    { field: 'collected', header: 'Recaudado', align: 'right', sortable: true, width: '150px' },
    {
      field: 'outstanding', header: 'Saldo pendiente', align: 'right', sortable: true, width: '160px',
      filter: { type: 'numericRange' },
    },
    { field: 'segments', header: 'Antigüedad del saldo', width: '200px' },
    { field: 'goto', header: '', align: 'center', width: '56px' },
  ];

  readonly globalFilterFields = ['customerName'];

  /**
   * IMPORTANTE: este array NO puede ser un getter ni una expresión que devuelva
   * un array nuevo en cada ciclo de detección de cambios — eso rompe la
   * paginación de `app-data-table`. Es un `computed()`: solo se recalcula
   * cuando cambia la respuesta del endpoint.
   */
  readonly rows = computed<PortfolioCustomerRow[]>(() =>
    (this.data()?.customers ?? []).map(c => ({
      ...c,
      segments: this.segmentsOf(c),
      oldestLabel: c.oldestBucket
        ? `Lo más antiguo: ${(PORTFOLIO_AGING_LABELS[c.oldestBucket] ?? c.oldestBucket).toLowerCase()}`
        : 'Sin saldo pendiente',
    }))
  );

  private segmentsOf(customer: PortfolioCustomer): PortfolioAgingSegment[] {
    const slices = (customer.aging ?? []).filter(s => (s.amount ?? 0) > 0);
    const total = slices.reduce((acc, s) => acc + s.amount, 0);
    if (total <= 0) return [];
    // El orden del contrato se respeta, pero se blinda por si llegara alterado.
    return slices
      .slice()
      .sort((a, b) => PORTFOLIO_AGING_BUCKETS.indexOf(a.bucket) - PORTFOLIO_AGING_BUCKETS.indexOf(b.bucket))
      .map(s => ({
        bucket: s.bucket,
        amount: s.amount,
        percent: (s.amount / total) * 100,
        color: BUCKET_COLORS[s.bucket] ?? PALETTE.primary,
      }));
  }

  onRowClick(row: unknown): void {
    const customer = row as PortfolioCustomerRow | null;
    if (!customer) return;
    this.customerSelected.emit(customer);
  }

  // ------------------------------------------------------------ formato

  money(value: number): string {
    const n = Number.isFinite(value) ? value : 0;
    return `$ ${Math.round(n).toLocaleString('es-CO')}`;
  }

  /** Formato corto para los ejes: $ 500 M, $ 125 K, $ 0. */
  compactMoney(value: number): string {
    const n = Number.isFinite(value) ? value : 0;
    const abs = Math.abs(n);
    if (abs >= 1_000_000_000) return `$ ${this.trim(n / 1_000_000_000)} MM`;
    if (abs >= 1_000_000) return `$ ${this.trim(n / 1_000_000)} M`;
    if (abs >= 1_000) return `$ ${this.trim(n / 1_000)} K`;
    return `$ ${Math.round(n).toLocaleString('es-CO')}`;
  }

  private trim(n: number): string {
    return n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  }

  private monthLabel(m: { year: number; month: number }): string {
    const name = MONTH_SHORT[Math.min(Math.max((m.month ?? 1) - 1, 0), 11)];
    return `${name} ${String(m.year ?? '').slice(-2)}`;
  }

  private shortDate(date: Date): string {
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  trackBucket(_index: number, item: { bucket: string }): string {
    return item.bucket;
  }
}
