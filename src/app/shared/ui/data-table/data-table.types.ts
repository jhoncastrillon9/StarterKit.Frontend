export interface DataTableColumn {
  field: string;
  header: string;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  sortField?: string;
  width?: string;
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
