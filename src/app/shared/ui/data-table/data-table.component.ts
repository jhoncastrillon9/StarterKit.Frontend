import {
  AfterContentInit, Component, ContentChildren, DestroyRef, OnInit, QueryList,
  TemplateRef, inject, input, output, signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TableModule, Table, TableLazyLoadEvent } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { DataTableColumnDirective } from './data-table-column.directive';
import { DataTableColumn, KpiDef, DataTableLazyEvent } from './data-table.types';
import { KpiCardComponent } from '../kpi-card/kpi-card.component';
import { FilterChipsComponent, ChipOption } from '../filter-chips/filter-chips.component';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [NgTemplateOutlet, TableModule, InputTextModule, KpiCardComponent, FilterChipsComponent],
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

  kpiClick = output<string>();
  chipChange = output<string>();
  searchChange = output<string>();
  lazyLoad = output<DataTableLazyEvent>();

  @ContentChildren(DataTableColumnDirective) private columnDirectives!: QueryList<DataTableColumnDirective>;
  private templates = new Map<string, TemplateRef<{ $implicit: unknown }>>();
  private destroyRef = inject(DestroyRef);

  // Paginación controlada por el footer custom (estilo diseño). p-table sigue
  // paginando internamente; su paginador nativo se oculta por CSS.
  readonly first = signal(0);
  readonly pageSize = signal(20);

  ngOnInit(): void {
    this.pageSize.set(this.rows());
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

  onSearch(dt: Table, value: string): void {
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
