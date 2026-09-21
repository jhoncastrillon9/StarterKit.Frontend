export class CustomerModel {
    customerId: number = 0;
    customerName: string = "";
    email: string  = "";
    address: string = "";
    customId: string = "";

    // Datos para facturacion electronica (DIAN). Opcionales mientras la FE no
    // este activa. Ver CustomerDTO del backend para la referencia al Anexo
    // Tecnico v1.9 de la Resolucion 000165 de 2023.
    personType?: string;
    documentType?: string;
    verificationDigit?: string;
    registrationName?: string;
    commercialName?: string;
    taxLevelCode?: string;
    taxSchemeId?: string;
    cityCode?: string;
    cityName?: string;
    departmentCode?: string;
    departmentName?: string;
    postalZone?: string;
    countryCode?: string;
    phone?: string;
    contactName?: string;
  }