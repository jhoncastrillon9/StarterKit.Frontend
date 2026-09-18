export interface Product {
  productId: number;
  name: string;
  description: string;
  price: number;
  productInternalCode: string;
  unitMeasurement: string;
}

export interface ProductPagedResponse {
  items: Product[];
  total: number;
}

/** Filtros del listado de productos; refleja ProductFilterRequest del backend. */
export class ProductFilterRequest {
  page: number = 1;
  pageSize: number = 10;
  search: string = '';
  name: string = '';
  code: string = '';
  description: string = '';
  priceFrom: number | null = null;
  priceTo: number | null = null;
  sortField: string = 'name';
  sortOrder: number = 1;
}
