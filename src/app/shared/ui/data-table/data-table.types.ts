export interface DataTableColumn {
  field: string;
  header: string;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  sortField?: string;
  width?: string;
  /** Filtro por columna. Si ninguna columna lo declara, no se renderiza la fila de filtros. */
  filter?: DataTableColumnFilter;
}

export interface DataTableColumnFilter {
  type: 'text' | 'select' | 'dateRange' | 'numericRange';
  /** Opciones del desplegable cuando type === 'select'. */
  options?: { label: string; value: unknown }[];
  placeholder?: string;
}

export interface KpiDef {
  key: string;
  label: string;
  value: string | number;
  dotColor: string;
  share?: string;
}

export interface DataTableLazyEvent {
  first: number;
  rows: number;
  sortField?: string;
  sortOrder?: number;
  globalFilter?: string;
}
