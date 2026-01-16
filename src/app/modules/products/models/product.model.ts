export interface Product {
  productId: number;
  name: string;
  description: string;
  price: number;
  productInternalCode: string;
}

export interface ProductPagedResponse {
  items: Product[];
  totalCount: number;
  page: number;
  pageSize: number;
}
