import {
  AfterContentInit, Component, ContentChild, ContentChildren, DestroyRef, HostListener, OnInit, QueryList,
  TemplateRef, inject, input, output, signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule, Table, TableLazyLoadEvent } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CalendarModule } from 'primeng/calendar';
import { FilterService } from 'primeng/api';
import { DataTableColumnDirective } from './data-table-column.directive';
import { DataTableColumn, KpiDef, DataTableLazyEvent } from './data-table.types';
import { KpiCardComponent } from '../kpi-card/kpi-card.component';
import { FilterChipsComponent, ChipOption } from '../filter-chips/filter-chips.component';

/** El backend entrega fechas como string ISO; p-calendar entrega Date. Funciones puras
 *  a nivel de módulo para que el registro del match mode no capture ninguna instancia. */
function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [
    NgTemplateOutlet, FormsModule, TableModule, InputTextModule, InputNumberModule,
    CalendarModule, KpiCardComponent, FilterChipsComponent,
  ],
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss'],
})
export class DataTableComponent implements AfterContentInit, OnInit {
  columns = input<DataTableColumn[]>([]);
  value = input<any[]>([]);
  loading = input<boolean>(false);
  rowKey = input<string>('');
  title = input<string>('');
  subtitle = input<string>('');
  headerIcon = input<string>('');
  kpis = input<KpiDef[]>([]);
  activeKpi = input<string>('');
  chips = input<ChipOption[]>([]);
  activeChip = input<string>('');
  searchPlaceholder = input<string>('Buscar…');
  showSearch = input<boolean>(true);
  globalFilterFields = input<string[]>([]);
  rows = input<number>(20);
  rowsPerPageOptions = input<number[]>([20, 40, 60, 100]);
  sortField = input<string>('');
  sortOrder = input<number>(-1);
  currentPageReportTemplate = input<string>('{first} - {last} de {totalRecords}');
  lazy = input<boolean>(false);
  totalRecords = input<number>(0);
  /** Habilita una columna de despliegue por fila. Requiere rowKey y un
   *  <ng-template #dtRowExpansion let-row> con el contenido del panel. */
  expandable = input<boolean>(false);

  kpiClick = output<string>();
  chipChange = output<string>();
  searchChange = output<string>();
  lazyLoad = output<DataTableLazyEvent>();

  @ContentChildren(DataTableColumnDirective) private columnDirectives!: QueryList<DataTableColumnDirective>;
  @ContentChild('dtRowExpansion') rowExpansionTemplate: TemplateRef<{ $implicit: unknown }> | null = null;
  private templates = new Map<string, TemplateRef<{ $implicit: unknown }>>();
  private destroyRef = inject(DestroyRef);
  private filterService = inject(FilterService);

  /** Columnas + la de despliegue, para el colspan de filas especiales. */
  totalColumnCount(): number {
    return this.columns().length + (this.expandable() ? 1 : 0);
  }

  // Paginación controlada por el footer custom (estilo diseño). p-table sigue
  // paginando internamente; su paginador nativo se oculta por CSS.
  readonly first = signal(0);
  readonly pageSize = signal(20);
  readonly searchValue = signal('');

  ngOnInit(): void {
    this.pageSize.set(this.rows());
    this.registerRangeFilters();
  }

  ngAfterContentInit(): void {
    this.rebuildTemplateMap();
    const sub = this.columnDirectives.changes.subscribe(() => this.rebuildTemplateMap());
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  private rebuildTemplateMap(): void {
    this.templates.clear();
    this.columnDirectives.forEach(d => this.templates.set(d.dtColumn(), d.templateRef));
  }

  templateFor(field: string): TemplateRef<{ $implicit: unknown }> | null {
    return this.templates.get(field) ?? null;
  }

  /** Resolve a possibly-nested field path like 'customerDto.customerName'. */
  resolve(row: any, field: string): unknown {
    return field.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), row);
  }

  /** true si alguna columna declaró filtro: sin esto no se pinta el botón de embudo. */
  hasColumnFilters(): boolean {
    return this.columns().some(c => !!c.filter);
  }

  /** Devuelve un rango nuevo con un extremo cambiado, o null si el rango quedó vacío. */
  updateRange(current: unknown, index: 0 | 1, value: unknown): unknown[] | null {
    const range = Array.isArray(current) ? [...current] : [null, null];
    range[index] = value ?? null;
    return range[0] == null && range[1] == null ? null : range;
  }

  clearColumnFilters(dt: Table): void {
    for (const col of this.columns()) {
      const c = dt.filters[col.field] as any;
      if (col.filter && c && !Array.isArray(c)) c.value = null;
    }
    if (dt.filters['global']) (dt.filters['global'] as any).value = null;
    this.searchValue.set('');
    this.searchChange.emit('');
    this.openFilterField.set(null);
    this.calendarOverlayOpen.set(false);
    if (this.lazy()) {
      this.resetToFirstPage();
    } else {
      dt._filter();
      this.first.set(0);
    }
  }

  // ---- Panel de filtro por columna (uno solo abierto a la vez) ----
  readonly openFilterField = signal<string | null>(null);

  toggleFilterPanel(field: string): void {
    this.openFilterField.set(this.openFilterField() === field ? null : field);
    this.calendarOverlayOpen.set(false);
  }

  closeFilterPanel(): void {
    this.openFilterField.set(null);
    this.calendarOverlayOpen.set(false);
  }

  /** El p-calendar del rango de fechas usa appendTo="body": su popup vive fuera del
   *  árbol del componente, así que closest('.dc-filter-panel') nunca lo encuentra.
   *  En vez de asumir para siempre el estado de ese overlay a partir del nombre de
   *  su clase CSS (frágil entre versiones de PrimeNG), se seguimos el estado real
   *  vía sus eventos públicos (onShow/onClose, ver binding en el html). El nombre
   *  de clase (.p-datepicker) solo se usa como respaldo puntual para distinguir,
   *  mientras ese overlay sigue abierto, un clic dentro de él de uno realmente
   *  afuera de todo. */
  readonly calendarOverlayOpen = signal(false);

  /** Cierra el panel al hacer clic fuera de él, fuera de cualquier botón de embudo
   *  y fuera de un overlay propio (hoy: el calendario) que siga abierto. No se usa
   *  stopPropagation en los botones para poder detectar aquí el "afuera". */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.openFilterField()) return;
    const target = event.target as HTMLElement | null;
    if (target && (target.closest('.dc-filter-panel') || target.closest('.dc-filter-btn'))) return;
    if (this.calendarOverlayOpen() && target?.closest('.p-datepicker')) return;
    this.openFilterField.set(null);
    this.calendarOverlayOpen.set(false);
  }

  /** IMPORTANTE: nunca llamar dt.filter(null, ...) para vaciar un filtro — PrimeNG 17
   *  borra la clave de dt.filters cuando el valor queda "vacío" y ColumnFilter revienta
   *  al leer filterConstraint.value sin optional chaining en el siguiente ciclo. Por eso
   *  todo cambio de valor (incluida la limpieza) pasa por aquí: se escribe en el sitio
   *  sobre el objeto constraint ya existente (o uno nuevo creado una sola vez) y se
   *  dispara el filtrado explícitamente, nunca a través de dt.filter(...). */
  private applyColumnFilter(dt: Table, field: string, matchMode: string, value: unknown): void {
    let c = dt.filters[field] as any;
    if (!c || Array.isArray(c)) {
      c = { value: null, matchMode };
      dt.filters[field] = c;
    }
    c.value = value;
    if (this.lazy()) {
      this.resetToFirstPage();
    } else {
      dt._filter();
      this.first.set(0);
    }
  }

  clearOneFilter(dt: Table, field: string): void {
    this.applyColumnFilter(dt, field, this.matchModeForField(dt, field), null);
  }

  private matchModeForField(dt: Table, field: string): string {
    const c = dt.filters[field] as any;
    if (c && !Array.isArray(c) && c.matchMode) return c.matchMode;
    const col = this.columns().find(x => x.field === field);
    return col ? this.matchModeFor(col) : 'contains';
  }

  isFilterActive(dt: Table, field: string): boolean {
    const c = dt.filters[field] as any;
    if (!c || Array.isArray(c)) return false;
    const v = c.value;
    if (v == null) return false;
    if (typeof v === 'string') return v.trim().length > 0;
    if (Array.isArray(v)) return v.length > 0;
    return true;
  }

  // -- Texto --
  filterTextValue(dt: Table, field: string): string {
    const c = dt.filters[field] as any;
    return c && !Array.isArray(c) && typeof c.value === 'string' ? c.value : '';
  }

  onFilterText(dt: Table, field: string, matchMode: string, value: string): void {
    this.applyColumnFilter(dt, field, matchMode, value && value.length ? value : null);
  }

  // -- Selección múltiple --
  filterSelectValues(dt: Table, field: string): unknown[] {
    const c = dt.filters[field] as any;
    return c && !Array.isArray(c) && Array.isArray(c.value) ? c.value : [];
  }

  toggleFilterOption(dt: Table, field: string, matchMode: string, optionValue: unknown): void {
    const current = this.filterSelectValues(dt, field);
    const next = current.includes(optionValue)
      ? current.filter(v => v !== optionValue)
      : [...current, optionValue];
    this.applyColumnFilter(dt, field, matchMode, next.length ? next : null);
  }

  /** Conteo por opción sobre los datos ya visibles (post búsqueda/chip de estado,
   *  pre filtros de columna), igual que en el prototipo aprobado. */
  optionCount(col: DataTableColumn, optionValue: unknown): number {
    return this.value().filter(row => this.resolve(row, col.field) === optionValue).length;
  }

  // -- Rango numérico --
  rangeValue(dt: Table, field: string): unknown[] {
    const c = dt.filters[field] as any;
    return c && !Array.isArray(c) && Array.isArray(c.value) ? c.value : [null, null];
  }

  onRangePart(dt: Table, field: string, matchMode: string, index: 0 | 1, value: unknown): void {
    this.applyColumnFilter(dt, field, matchMode, this.updateRange(this.rangeValue(dt, field), index, value));
  }

  // -- Rango de fechas --
  dateRangeValue(dt: Table, field: string): Date[] | null {
    const c = dt.filters[field] as any;
    return c && !Array.isArray(c) && Array.isArray(c.value) ? (c.value as Date[]) : null;
  }

  onDateRangeChange(dt: Table, field: string, matchMode: string, range: Date[] | null): void {
    this.applyColumnFilter(dt, field, matchMode, range && (range[0] || range[1]) ? range : null);
  }

  // -- Franja de chips con los filtros activos --
  activeFilterChips(dt: Table): { field: string; label: string }[] {
    return this.columns()
      .filter(c => c.filter && this.isFilterActive(dt, c.field))
      .map(c => ({ field: c.field, label: c.header + ': ' + this.filterValueLabel(dt, c) }));
  }

  anyActiveFilter(dt: Table): boolean {
    return this.activeFilterChips(dt).length > 0 || !!this.searchValue();
  }

  private filterValueLabel(dt: Table, col: DataTableColumn): string {
    switch (col.filter?.type) {
      case 'select': {
        const opts = col.filter.options || [];
        const selected = this.filterSelectValues(dt, col.field);
        return selected.map(v => opts.find(o => o.value === v)?.label ?? String(v)).join(', ');
      }
      case 'dateRange': {
        const range = this.dateRangeValue(dt, col.field) || [null, null];
        return this.formatDateLabel(range[0]) + ' a ' + this.formatDateLabel(range[1]);
      }
      case 'numericRange': {
        const range = this.rangeValue(dt, col.field);
        const min = range[0], max = range[1];
        return (min != null ? String(min) : '…') + ' a ' + (max != null ? String(max) : '…');
      }
      default:
        return this.filterTextValue(dt, col.field);
    }
  }

  private formatDateLabel(value: unknown): string {
    if (!value) return '…';
    const date = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(date.getTime()) ? '…' : date.toLocaleDateString('es-CO');
  }

  matchModeFor(col: DataTableColumn): string {
    switch (col.filter?.type) {
      case 'select': return 'in';
      case 'dateRange': return 'dcDateRange';
      case 'numericRange': return 'dcNumericRange';
      default: return 'contains';
    }
  }

  /** FilterService es providedIn: 'root', así que el registro es global y permanente
   *  para toda la app. Se registra una única vez (flag estático) y con funciones puras
   *  a nivel de módulo, para que ninguna instancia del componente quede retenida. */
  private static rangeFiltersRegistered = false;

  private registerRangeFilters(): void {
    if (DataTableComponent.rangeFiltersRegistered) return;
    DataTableComponent.rangeFiltersRegistered = true;

    this.filterService.register('dcDateRange', (value: unknown, range: unknown[] | null) => {
      if (!range || (range[0] == null && range[1] == null)) return true;
      const date = toDate(value);
      if (!date) return false;
      const from = toDate(range[0]);
      const to = toDate(range[1]);
      if (from && date < startOfDay(from)) return false;
      if (to && date > endOfDay(to)) return false;
      return true;
    });

    this.filterService.register('dcNumericRange', (value: unknown, range: unknown[] | null) => {
      if (!range || (range[0] == null && range[1] == null)) return true;
      const n = Number(value);
      if (Number.isNaN(n)) return false;
      if (range[0] != null && n < Number(range[0])) return false;
      if (range[1] != null && n > Number(range[1])) return false;
      return true;
    });
  }

  onSearch(dt: Table, value: string): void {
    this.searchValue.set(value);
    dt.filterGlobal(value, 'contains');
    this.first.set(0);
    this.searchChange.emit(value);
  }

  // ---- Paginación (footer custom) ----
  onPage(event: { first?: number; rows?: number }): void {
    this.first.set(event.first ?? 0);
    if (event.rows) this.pageSize.set(event.rows);
  }

  setPageSize(n: number): void {
    this.pageSize.set(n);
    this.first.set(0);
    if (this.lazy()) this.emitLazy();
  }

  prevPage(): void {
    this.first.set(Math.max(0, this.first() - this.pageSize()));
    if (this.lazy()) this.emitLazy();
  }

  nextPage(dt: Table): void {
    if (this.isLastPage(dt)) return;
    this.first.set(this.first() + this.pageSize());
    if (this.lazy()) this.emitLazy();
  }

  /** Reinicia a la primera página. Llamar al aplicar/limpiar filtros server-side. */
  resetToFirstPage(): void {
    this.first.set(0);
    if (this.lazy()) this.emitLazy();
  }

  private emitLazy(): void {
    this.lazyLoad.emit({
      first: this.first(),
      rows: this.pageSize(),
      sortField: this.sortField() || undefined,
      sortOrder: this.sortOrder(),
    });
  }

  totalCount(dt: Table): number {
    if (this.lazy()) return this.totalRecords();
    const filtered = (dt as unknown as { filteredValue?: unknown[] | null }).filteredValue;
    return filtered ? filtered.length : (this.value()?.length ?? 0);
  }

  rangeStart(dt: Table): number {
    return this.totalCount(dt) === 0 ? 0 : this.first() + 1;
  }

  rangeEnd(dt: Table): number {
    return Math.min(this.first() + this.pageSize(), this.totalCount(dt));
  }

  isLastPage(dt: Table): boolean {
    return this.first() + this.pageSize() >= this.totalCount(dt);
  }

  onLazy(event: TableLazyLoadEvent): void {
    if (!this.lazy()) return;
    this.lazyLoad.emit({
      first: event.first ?? 0,
      rows: event.rows ?? this.rows(),
      sortField: Array.isArray(event.sortField) ? event.sortField[0] : event.sortField ?? undefined,
      sortOrder: event.sortOrder ?? undefined,
      globalFilter: typeof event.globalFilter === 'string' ? event.globalFilter : undefined,
    });
  }
}
