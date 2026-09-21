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

/** Valor de un filtro por columna tal y como lo entrega la tabla. */
export interface DataTableFilterValue {
  /** Texto, array de opciones o rango [desde, hasta] segun el tipo de filtro. */
  value: unknown;
  matchMode: string;
}

export interface DataTableLazyEvent {
  first: number;
  rows: number;
  sortField?: string;
  sortOrder?: number;
  globalFilter?: string;
  /**
   * Filtros por columna activos, indexados por `field`. En modo lazy la tabla no
   * puede filtrar por su cuenta: el consumidor los traduce a su peticion de
   * backend. Solo trae las columnas con filtro puesto.
   */
  filters?: Record<string, DataTableFilterValue>;
}
