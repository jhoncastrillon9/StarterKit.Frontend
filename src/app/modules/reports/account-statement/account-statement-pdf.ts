import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BudgetModel } from '../../budgets/models/budget.Model';
import { CustomerModel } from '../../customers/models/customer.Model';
import * as cartera from './account-statement.calculations';

/**
 * El informe PDF del estado de cuenta.
 *
 * Vive fuera del componente a propósito: el documento que la constructora le
 * manda a su cliente es una pieza con vida propia, y mezclarlo con el estado de
 * la pantalla hacía imposible leer ninguna de las dos cosas. Aquí solo entran
 * datos ya calculados o calculables con `account-statement.calculations.ts`.
 */

// ------------------------------------------------------------------ paleta
//
// Mismos valores que `_dc-tokens.scss` y `account-statement.component.scss`,
// en RGB porque jsPDF no entiende hexadecimales de CSS.

/** $primary */
const PDF_PRIMARY: [number, number, number] = [109, 40, 217];
/** $primary-light: fondo de las cajas de resumen. */
const PDF_PRIMARY_LIGHT: [number, number, number] = [243, 240, 252];
/** $credit */
const PDF_CREDIT: [number, number, number] = [21, 112, 63];
/** $ink */
const PDF_INK: [number, number, number] = [31, 27, 46];
/** $debt */
const PDF_DEBT: [number, number, number] = [192, 57, 43];
/** $muted */
const PDF_MUTED: [number, number, number] = [124, 118, 145];

// ------------------------------------------------------------------ formato

/** Miles con punto y sin decimales, como en toda la pantalla. */
function money(value: number): string {
  return (value ?? 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// -------------------------------------------------------------------- datos

/** Todo lo que el informe necesita saber. */
export interface AccountStatementPdfInput {
  /** Cotizaciones facturadas del cliente, ya filtradas y ordenadas. */
  budgets: BudgetModel[];
  /** Movimientos del cliente indexados por cotización. */
  movements: cartera.MovementIndex;
  customer: CustomerModel | null;
  /** La empresa que emite el informe (`CompanyService.getCompanyByUser`). */
  company: any;
}

/** Nombre de archivo sugerido, sin caracteres que incomoden al sistema. */
export function accountStatementFileName(customer: CustomerModel | null): string {
  const nombre = (customer?.customerName ?? 'cliente').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
  return `estado-cuenta-${nombre}.pdf`;
}

// --------------------------------------------------------------------- logo

/**
 * Descarga el logo de la empresa y lo convierte a base64 para jsPDF.
 *
 * Necesita DOM (Image + canvas), así que solo funciona en el navegador; es el
 * mismo entorno en el que se genera el informe.
 */
function getBase64ImageFromURL(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.setAttribute('crossOrigin', 'anonymous');
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d')?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ------------------------------------------------------------------ informe

/** Construye el informe y devuelve el documento, sin guardarlo. */
export async function buildAccountStatementPdf(input: AccountStatementPdfInput): Promise<jsPDF> {
  const { budgets: rows, movements, customer: cliente, company: empresa } = input;

  const totalFacturado = cartera.totalFacturado(rows);
  const totalAbonos = cartera.totalAbonos(rows, movements);
  const totalAjustes = cartera.totalAjustes(rows, movements);
  const totalSaldo = totalFacturado - totalAbonos - totalAjustes;

  const doc = new jsPDF();
  const marginX = 14;

  if (empresa?.urlImageLogo) {
    try {
      doc.addImage(await getBase64ImageFromURL(empresa.urlImageLogo), 'PNG', marginX, 12, 34, 17);
    } catch {
      // Sin logo: el encabezado de texto es suficiente.
    }
  }

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(empresa?.companyName || 'Estado de cuenta', 52, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(empresa?.address || '', 52, 24);
  doc.text([empresa?.telephones, empresa?.email].filter(Boolean).join('  ·  '), 52, 29);

  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('Estado de cuenta', marginX, 44);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Cliente: ${cliente?.customerName ?? ''}`, marginX, 52);
  if (cliente?.email) doc.text(`Email: ${cliente.email}`, marginX, 57);
  if (cliente?.address) doc.text(`Dirección: ${cliente.address}`, marginX, 62);
  doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-CO')}`, marginX, 67);

  // Bloque de resumen: facturado / abonado / saldo, antes de la tabla de detalle.
  const summaryY = 76;
  const summaryBoxWidth = 56;
  const summaryLabels: [string, string, [number, number, number]][] = [
    ['Facturado', `$ ${money(totalFacturado)}`, PDF_INK],
    ['Abonado', `$ ${money(totalAbonos + totalAjustes)}`, PDF_CREDIT],
    ['Saldo', `$ ${money(totalSaldo)}`, PDF_DEBT],
  ];
  summaryLabels.forEach(([label, value, color], i) => {
    const x = marginX + i * (summaryBoxWidth + 6);
    doc.setFillColor(...PDF_PRIMARY_LIGHT);
    doc.roundedRect(x, summaryY, summaryBoxWidth, 22, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setTextColor(...PDF_MUTED);
    doc.text(label.toUpperCase(), x + 5, summaryY + 8);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...color);
    doc.text(value, x + 5, summaryY + 17);
    doc.setFont('helvetica', 'normal');
  });
  doc.setTextColor(0, 0, 0);

  const body = rows.map(b => [
    String(b.internalCode),
    b.externalInvoice && b.externalInvoice !== '0' ? b.externalInvoice : '—',
    new Date(b.date).toLocaleDateString('es-CO'),
    b.budgetName,
    `$ ${money(b.total ?? 0)}`,
    `$ ${money(cartera.abonosFor(movements, b.budgetId))}`,
    `$ ${money(cartera.ajustesFor(movements, b.budgetId))}`,
    `$ ${money(cartera.saldoFor(b, movements))}`,
  ]);

  autoTable(doc, {
    head: [['Código', 'Factura', 'Fecha', 'Obra', 'Facturado', 'Abonos', 'Ajustes', 'Saldo']],
    body,
    foot: [[
      { content: 'Totales', colSpan: 4 },
      `$ ${money(totalFacturado)}`,
      `$ ${money(totalAbonos)}`,
      `$ ${money(totalAjustes)}`,
      `$ ${money(totalSaldo)}`,
    ]],
    startY: summaryY + 30,
    theme: 'grid',
    headStyles: { fillColor: PDF_PRIMARY, textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: PDF_PRIMARY_LIGHT, textColor: 20, fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 2.4 },
    alternateRowStyles: { fillColor: [250, 249, 253] },
    columnStyles: {
      4: { halign: 'right' }, 5: { halign: 'right' },
      6: { halign: 'right' }, 7: { halign: 'right' },
    },
  });

  return doc;
}
