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
