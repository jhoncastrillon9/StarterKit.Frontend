import {
  AfterContentInit, Component, ContentChildren, DestroyRef, QueryList,
  TemplateRef, inject, input, output,
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
export class DataTableComponent implements AfterContentInit {
  columns = input<DataTableColumn[]>([]);
  value = input<any[]>([]);
  loading = input<boolean>(false);
  rowKey = input<string>('');
  title = input<string>('');
  subtitle = input<string>('');
  kpis = input<KpiDef[]>([]);
  activeKpi = input<string>('');
  chips = input<ChipOption[]>([]);
  activeChip = input<string>('');
  searchPlaceholder = input<string>('Buscar…');
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
    this.searchChange.emit(value);
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
