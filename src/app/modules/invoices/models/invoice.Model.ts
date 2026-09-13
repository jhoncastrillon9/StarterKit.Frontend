export class InvoiceDetailModel {
  invoiceDetailId: number = 0;
  invoiceId: number = 0;
  description: string = '';
  quantity: number = 0;
  unitMeasurement: string = 'Und';
  price: number = 0;
  isTitle: boolean = false;
  total: number = 0;
}

export class InvoiceCustomerModel {
  customerId: number = 0;
  customerName: string = '';
  email: string = '';
  customId: string = '';
  address: string = '';
}

export class InvoiceModel {
  invoiceId: number = 0;
  companyId: number = 0;
  customerId: number = 0;
  budgetId: number = 0;
  userId: number = 0;
  invoiceResolutionId: number | null = null;

  customerDto: InvoiceCustomerModel | null = null;
  budgetInternalCode: number = 0;

  prefix: string | null = null;
  number: number | null = null;
  fullNumber: string = '';

  /** Borrador | Emitida | Enviada */
  status: string = 'Borrador';

  issueDate: string | null = null;
  dueDate: string | null = null;
  createdAt: string = '';
  sentAt: string | null = null;

  wayToPay: string = '';
  note: string = '';

  hasIVA: boolean = true;
  hasAIU: boolean = true;
  sumAIU: boolean = true;

  amount: number = 0;

  invoiceDetailsDto: InvoiceDetailModel[] = [];

  // Calculados por el backend, solo lectura
  subtotal: number = 0;
  aiu: number = 0;
  iva: number = 0;
  total: number = 0;
}

export class InvoiceResolutionModel {
  invoiceResolutionId: number = 0;
  resolutionNumber: string = '';
  prefix: string = '';
  rangeFrom: number = 0;
  rangeTo: number = 0;
  currentNumber: number = 0;
  validFrom: string = '';
  validTo: string = '';
  isActive: boolean = true;
  remaining: number = 0;
  isExpired: boolean = false;
}

/** Los tres estados, para no repetir cadenas sueltas por la UI. */
export const INVOICE_STATUS = {
  draft: 'Borrador',
  issued: 'Emitida',
  sent: 'Enviada'
};
