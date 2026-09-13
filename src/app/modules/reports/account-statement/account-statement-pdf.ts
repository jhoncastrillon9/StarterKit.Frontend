import jsPDF from 'jspdf';
import autoTable, { CellDef, RowInput } from 'jspdf-autotable';
import { BudgetModel } from '../../budgets/models/budget.Model';
import { CustomerModel } from '../../customers/models/customer.Model';
import { PaymentModel } from '../../payments/models/payment.Model';
import * as cartera from './account-statement.calculations';

/**
 * El informe PDF del estado de cuenta.
 *
 * Vive fuera del componente a propósito: el documento que la constructora le
 * manda a su cliente es una pieza con vida propia, y mezclarlo con el estado de
 * la pantalla hacía imposible leer ninguna de las dos cosas. Aquí solo entran
 * datos ya calculados o calculables con `account-statement.calculations.ts`.
 *
 * ESTRUCTURA DEL DOCUMENTO
 *   1. Encabezado de empresa + bloque de cliente + cuatro tarjetas de resumen.
 *   2. Detalle por cotización: cada cotización es un BLOQUE — su cabecera con
 *      los totales y, sangrados debajo, sus movimientos uno a uno.
 *   3. (Task 5) Anexo de transferencias.
 *   4. Pie en todas las páginas: numeración y la nota de antigüedad.
 *
 * PAGINACIÓN
 * El detalle es UNA sola tabla de `jspdf-autotable`, no una por cotización: así
 * el corte de página, la repetición de la cabecera y el ajuste de las notas
 * largas los resuelve la librería, que es la única que sabe cuánto mide una
 * celda una vez compuesta. El pie y el encabezado de continuación se dibujan al
 * final, recorriendo las páginas ya generadas, porque hasta entonces no se sabe
 * cuántas hay.
 */

// ------------------------------------------------------------------ paleta
//
// Mismos valores que `_dc-tokens.scss` y `account-statement.component.scss`,
// en RGB porque jsPDF no entiende hexadecimales de CSS.

type RGB = [number, number, number];

/** $primary */
const PRIMARY: RGB = [109, 40, 217];
/** $primary-dark: titulares del documento. */
const PRIMARY_DARK: RGB = [91, 33, 182];
/** $primary-light: fondo de cabeceras de tabla y pastillas. */
const PRIMARY_LIGHT: RGB = [244, 242, 251];
/** $credit */
const CREDIT: RGB = [21, 112, 63];
/** $adjust */
const ADJUST: RGB = [180, 83, 9];
/** $ink */
const INK: RGB = [31, 27, 46];
/** $debt */
const DEBT: RGB = [192, 57, 43];
/** $muted */
const MUTED: RGB = [124, 118, 145];
/** $muted-soft: etiquetas y textos de apoyo. */
const MUTED_SOFT: RGB = [160, 154, 181];
/** $line: separadores. */
const LINE: RGB = [232, 230, 240];
/** Fondo de la fila de cabecera de cada cotización. */
const ROW_TINT: RGB = [251, 250, 255];

// ------------------------------------------------------------- geometría

const PAGE_W = 210;
const PAGE_H = 297;
const M = 14;
const CONTENT_W = PAGE_W - M * 2;
/** Espacio reservado abajo para el pie. */
const FOOT_RESERVE = 24;
/** Espacio que ocupa el encabezado compacto de las páginas de continuación. */
const CONT_HEAD_H = 26;

// ------------------------------------------------------------------ formato

/** Miles con punto y sin decimales, como en toda la pantalla. */
function money(value: number): string {
  return (value ?? 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/** `$ 1.234.000`, la forma en que aparece cualquier cifra del informe. */
function cop(value: number): string {
  return `$ ${money(value)}`;
}

function shortDate(value: Date | string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('es-CO');
}

function longDate(value: Date | string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
}

/**
 * El número de factura lo teclea a mano la constructora y puede venir vacío, o
 * con el `'0'` que dejaba el formulario antiguo. Nunca se imprime en blanco: el
 * cliente tiene que poder distinguir «no hay factura» de «se me olvidó mirar».
 */
function invoiceLabel(budget: BudgetModel | undefined): string {
  const raw = (budget?.externalInvoice ?? '').trim();
  return raw && raw !== '0' ? raw : 'Sin registrar';
}

/** `COT-184`, el código interno tal y como lo reconoce el cliente. */
function budgetCode(budget: BudgetModel | undefined): string {
  return budget ? `COT-${budget.internalCode}` : 'Cotización desconocida';
}

/** Recorta un texto libre para que no reviente una celda de una línea. */
function clamp(text: string, max: number): string {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}

/** Etiqueta de la transferencia de un movimiento, o el aviso de que no tiene. */
function transferLabel(movement: PaymentModel): string {
  const id = movement?.transferId;
  if (!id) return 'Sin transferencia';
  if (movement.transferAmount == null) return `TR-${id}`;
  const date = shortDate(movement.transferDate);
  return date ? `TR-${id} · ${date} · ${cop(movement.transferAmount)}` : `TR-${id} · ${cop(movement.transferAmount)}`;
}

/** Los movimientos de una cotización, del más antiguo al más reciente. */
function sortedMovements(movements: cartera.MovementIndex, budgetId: number): PaymentModel[] {
  return [...cartera.movementsFor(movements, budgetId)].sort(
    (a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
  );
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

// ----------------------------------------------------------- primitivas de dibujo

function setText(doc: jsPDF, size: number, color: RGB, bold = false): void {
  doc.setFontSize(size);
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setTextColor(color[0], color[1], color[2]);
}

/** Un rótulo en versalitas: la etiqueta gris que encabeza cada dato. */
function drawLabel(doc: jsPDF, text: string, x: number, y: number, align: 'left' | 'right' = 'left'): void {
  setText(doc, 6.2, MUTED_SOFT, true);
  doc.text((text ?? '').toUpperCase(), x, y, { align });
}

// ------------------------------------------------------------ encabezados

/** Las tres líneas de contacto de la empresa, sin huecos si falta alguna. */
function companyLines(empresa: any): string[] {
  return [
    empresa?.address,
    [empresa?.telephones, empresa?.email].filter(Boolean).join('  ·  '),
  ].filter((line: string) => !!line && line.trim().length > 0);
}

/** Encabezado completo de la primera página. Devuelve la Y en la que termina. */
function drawMainHeader(doc: jsPDF, empresa: any, logo: string | null): number {
  let textX = M;
  if (logo) {
    try {
      doc.addImage(logo, 'PNG', M, 12, 30, 15);
      textX = M + 36;
    } catch {
      // Sin logo: el encabezado de texto es suficiente.
    }
  }

  setText(doc, 12, INK, true);
  doc.text(clamp(empresa?.companyName || 'Estado de cuenta', 48), textX, 17);
  setText(doc, 7.5, MUTED);
  let y = 22;
  for (const line of companyLines(empresa)) {
    doc.text(clamp(line, 70), textX, y);
    y += 4.2;
  }

  setText(doc, 14, PRIMARY_DARK, true);
  doc.text('ESTADO DE CUENTA', PAGE_W - M, 17, { align: 'right' });
  setText(doc, 7.5, MUTED);
  doc.text(`Emitido el ${longDate(new Date())}`, PAGE_W - M, 22, { align: 'right' });
  doc.text(`Corte: ${shortDate(new Date())}  ·  Moneda: COP`, PAGE_W - M, 26.2, { align: 'right' });

  const ruleY = Math.max(y + 1.5, 31);
  doc.setDrawColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.setLineWidth(0.7);
  doc.line(M, ruleY, PAGE_W - M, ruleY);
  return ruleY;
}

/** Encabezado reducido de las páginas 2 en adelante. */
function drawContinuationHeader(doc: jsPDF, empresa: any, cliente: CustomerModel | null): void {
  setText(doc, 9, INK, true);
  doc.text(clamp(empresa?.companyName || 'Estado de cuenta', 46), M, 14);
  setText(doc, 7.5, PRIMARY_DARK, true);
  doc.text('ESTADO DE CUENTA', PAGE_W - M, 12.5, { align: 'right' });
  setText(doc, 7, MUTED);
  doc.text(clamp(`${cliente?.customerName ?? ''} · ${shortDate(new Date())}`, 72), PAGE_W - M, 16.5, { align: 'right' });

  doc.setDrawColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.setLineWidth(0.5);
  doc.line(M, 19, PAGE_W - M, 19);
}

/** Bloque de cliente y saldo destacado. Devuelve la Y en la que termina. */
function drawCustomerBlock(
  doc: jsPDF,
  cliente: CustomerModel | null,
  startY: number,
  saldo: number,
  billedCount: number
): number {
  let y = startY + 7;
  const pairs: [string, string][] = [
    ['Cliente', cliente?.customerName ?? '—'],
    ['NIT / CC', (cliente?.customId ?? '').trim() || '—'],
    ['Dirección', (cliente?.address ?? '').trim() || '—'],
    ['Correo', (cliente?.email ?? '').trim() || '—'],
  ];

  for (const [key, value] of pairs) {
    drawLabel(doc, key, M, y);
    setText(doc, 8, INK, true);
    doc.text(clamp(value, 62), M + 20, y);
    y += 4.6;
  }

  drawLabel(doc, 'Saldo pendiente', PAGE_W - M, startY + 7, 'right');
  setText(doc, 19, DEBT, true);
  doc.text(cop(saldo), PAGE_W - M, startY + 15.5, { align: 'right' });
  setText(doc, 7, MUTED);
  doc.text(
    `${billedCount} ${billedCount === 1 ? 'cotización facturada' : 'cotizaciones facturadas'}`,
    PAGE_W - M, startY + 19.5, { align: 'right' }
  );

  const endY = Math.max(y, startY + 22);
  doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
  doc.setLineWidth(0.3);
  doc.line(M, endY, PAGE_W - M, endY);
  return endY;
}

/** Las cuatro tarjetas de resumen. Devuelve la Y en la que terminan. */
function drawSummaryCards(
  doc: jsPDF,
  totals: { facturado: number; abonos: number; ajustes: number; saldo: number },
  startY: number
): number {
  const cards: [string, number, RGB][] = [
    ['Facturado', totals.facturado, INK],
    ['Abonos', totals.abonos, CREDIT],
    ['Ajustes', totals.ajustes, ADJUST],
    ['Saldo', totals.saldo, DEBT],
  ];
  const gap = 3.5;
  const w = (CONTENT_W - gap * 3) / 4;
  const h = 14;

  cards.forEach(([label, value, color], i) => {
    const x = M + i * (w + gap);
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, startY, w, h, 1.6, 1.6, 'S');
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(x + 2.5, startY + 3.2, 1.2, h - 6.4, 0.6, 0.6, 'F');
    drawLabel(doc, label, x + 5.6, startY + 5.8);
    setText(doc, 10, color, true);
    doc.text(cop(value), x + 5.6, startY + 10.8);
  });

  return startY + h;
}

/** Título de sección: el rótulo gris con la línea que lo acompaña. */
function drawSectionTitle(doc: jsPDF, text: string, hint: string, y: number): number {
  drawLabel(doc, text, M, y);
  const textW = doc.getTextWidth((text ?? '').toUpperCase());
  setText(doc, 6.5, MUTED_SOFT);
  const hintW = hint ? doc.getTextWidth(hint) : 0;
  if (hint) doc.text(hint, PAGE_W - M, y, { align: 'right' });
  doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
  doc.setLineWidth(0.3);
  doc.line(M + textW + 3, y - 1, PAGE_W - M - (hintW ? hintW + 3 : 0), y - 1);
  return y + 3;
}

// --------------------------------------------------- detalle por cotización

/**
 * Anchos de las ocho columnas del detalle. Las filas de movimiento reutilizan
 * las mismas columnas agrupando celdas: fecha | tipo | nota (3) | valor |
 * transferencia (2), que es la lectura del diseño aprobado.
 */
const DETAIL_COLUMNS: Record<number, { cellWidth: number; halign?: 'left' | 'right' | 'center' }> = {
  0: { cellWidth: 20 },
  1: { cellWidth: 16 },
  2: { cellWidth: 38 },
  3: { cellWidth: 20 },
  4: { cellWidth: 14, halign: 'center' },
  5: { cellWidth: 24, halign: 'right' },
  6: { cellWidth: 24, halign: 'right' },
  7: { cellWidth: 26, halign: 'right' },
};

/** Resumen en una línea de lo que se le ha aplicado a una cotización. */
function movementsSummary(movements: readonly PaymentModel[]): string {
  const abonos = movements.filter(m => cartera.kindOf(m) === 'Abono');
  const ajustes = movements.filter(m => cartera.kindOf(m) === 'Ajuste');
  const parts: string[] = [];
  parts.push(
    abonos.length
      ? `${abonos.length} ${abonos.length === 1 ? 'abono' : 'abonos'} por ${cop(cartera.sumMovements(abonos))}`
      : 'sin abonos'
  );
  parts.push(
    ajustes.length
      ? `${ajustes.length} ${ajustes.length === 1 ? 'ajuste' : 'ajustes'} por ${cop(cartera.sumMovements(ajustes))}`
      : 'sin ajustes'
  );
  return parts.join('  ·  ');
}

/** Las filas de una cotización: su cabecera, sus movimientos y su subtotal. */
function detailRowsFor(budget: BudgetModel, movements: cartera.MovementIndex): RowInput[] {
  const list = sortedMovements(movements, budget.budgetId);
  const aplicado = cartera.appliedFor(movements, budget.budgetId);
  const saldo = cartera.saldoFor(budget, movements);
  const dias = cartera.agingDays(budget);

  const headerStyle = { fillColor: ROW_TINT, fontSize: 7.8, lineWidth: { bottom: 0.2 } as any, lineColor: LINE };
  const rows: RowInput[] = [
    [
      { content: budgetCode(budget), styles: { ...headerStyle, textColor: PRIMARY, fontStyle: 'bold' } },
      { content: shortDate(budget.date), styles: { ...headerStyle, textColor: INK } },
      { content: clamp(budget.budgetName ?? '', 120), styles: { ...headerStyle, textColor: INK, fontStyle: 'bold' } },
      { content: invoiceLabel(budget), styles: { ...headerStyle, textColor: MUTED } },
      { content: `${dias} d`, styles: { ...headerStyle, textColor: MUTED, halign: 'center' } },
      { content: cop(budget.total ?? 0), styles: { ...headerStyle, textColor: INK, fontStyle: 'bold', halign: 'right' } },
      { content: cop(aplicado), styles: { ...headerStyle, textColor: CREDIT, fontStyle: 'bold', halign: 'right' } },
      { content: cop(saldo), styles: { ...headerStyle, textColor: DEBT, fontStyle: 'bold', halign: 'right' } },
    ] as CellDef[],
  ];

  if (!list.length) {
    // Una cotización sin movimientos no puede dejar un hueco mudo: se dice.
    rows.push([
      {
        content: 'Sin movimientos registrados · esta cotización sigue pendiente por su valor total.',
        colSpan: 8,
        styles: {
          fontSize: 6.8, textColor: MUTED_SOFT, fontStyle: 'italic',
          cellPadding: { top: 1.6, bottom: 2.6, left: 6, right: 2 } as any,
          lineWidth: { bottom: 0.2 } as any, lineColor: LINE,
        },
      },
    ] as CellDef[]);
    return rows;
  }

  const subHeadStyle = {
    fontSize: 5.9, textColor: MUTED_SOFT, fontStyle: 'bold' as const,
    cellPadding: { top: 1.4, bottom: 0.6, left: 2, right: 2 } as any,
  };
  rows.push([
    { content: 'FECHA', styles: { ...subHeadStyle, cellPadding: { top: 1.4, bottom: 0.6, left: 6, right: 2 } as any } },
    { content: 'TIPO', styles: subHeadStyle },
    { content: 'NOTA', colSpan: 3, styles: subHeadStyle },
    { content: 'VALOR', styles: { ...subHeadStyle, halign: 'right' } },
    { content: 'TRANSFERENCIA', colSpan: 2, styles: subHeadStyle },
  ] as CellDef[]);

  for (const movement of list) {
    const kind = cartera.kindOf(movement);
    const color = kind === 'Ajuste' ? ADJUST : CREDIT;
    const base = { fontSize: 6.9, cellPadding: { top: 1.1, bottom: 1.1, left: 2, right: 2 } as any };
    rows.push([
      {
        content: shortDate(movement.paymentDate),
        styles: { ...base, textColor: MUTED, cellPadding: { top: 1.1, bottom: 1.1, left: 6, right: 2 } as any },
      },
      { content: kind, styles: { ...base, textColor: color, fontStyle: 'bold' } },
      { content: clamp(movement.note ?? '', 220) || '—', colSpan: 3, styles: { ...base, textColor: MUTED } },
      { content: cop(movement.amountPaid ?? 0), styles: { ...base, textColor: color, fontStyle: 'bold', halign: 'right' } },
      {
        content: transferLabel(movement),
        colSpan: 2,
        styles: { ...base, textColor: movement.transferId ? PRIMARY_DARK : MUTED_SOFT },
      },
    ] as CellDef[]);
  }

  const subtotalStyle = {
    fontSize: 6.6, textColor: MUTED, fontStyle: 'bold' as const,
    cellPadding: { top: 1.4, bottom: 2.6, left: 2, right: 2 } as any,
    lineWidth: { bottom: 0.2 } as any, lineColor: LINE,
  };
  rows.push([
    {
      content: movementsSummary(list),
      colSpan: 5,
      styles: { ...subtotalStyle, cellPadding: { top: 1.4, bottom: 2.6, left: 6, right: 2 } as any },
    },
    { content: 'Aplicado', styles: { ...subtotalStyle, halign: 'right' } },
    { content: cop(cartera.appliedFor(movements, budget.budgetId)), styles: { ...subtotalStyle, textColor: CREDIT, halign: 'right' } },
    { content: cop(saldo), styles: { ...subtotalStyle, textColor: DEBT, halign: 'right' } },
  ] as CellDef[]);

  return rows;
}

// ------------------------------------------------------------------- pie

/**
 * Pie de todas las páginas y encabezado de las de continuación.
 *
 * Se hace al final, cuando ya se sabe cuántas páginas tiene el documento: es la
 * única forma de escribir «Página 2 de 7» sin trucos de sustitución de texto.
 */
function drawChrome(doc: jsPDF, empresa: any, cliente: CustomerModel | null): void {
  const total = doc.getNumberOfPages();
  const note =
    'La antigüedad se cuenta en días desde la fecha de la cotización. Estas cotizaciones no tienen fecha de ' +
    'vencimiento pactada, de modo que la antigüedad no debe leerse como mora ni genera intereses.';

  for (let page = 1; page <= total; page++) {
    doc.setPage(page);
    if (page > 1) drawContinuationHeader(doc, empresa, cliente);

    const footY = PAGE_H - 14;
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    doc.setLineWidth(0.3);
    doc.line(M, footY - 4.5, PAGE_W - M, footY - 4.5);

    setText(doc, 6, MUTED_SOFT);
    const lines = doc.splitTextToSize(note, CONTENT_W - 30) as string[];
    doc.text(lines.slice(0, 2), M, footY - 1);

    setText(doc, 6.6, MUTED, true);
    doc.text(`Página ${page} de ${total}`, PAGE_W - M, footY - 1, { align: 'right' });
  }
}

// ------------------------------------------------------------------ informe

/** Construye el informe y devuelve el documento, sin guardarlo. */
export async function buildAccountStatementPdf(input: AccountStatementPdfInput): Promise<jsPDF> {
  const { budgets: rows, movements, customer: cliente, company: empresa } = input;

  const totals = {
    facturado: cartera.totalFacturado(rows),
    abonos: cartera.totalAbonos(rows, movements),
    ajustes: cartera.totalAjustes(rows, movements),
    saldo: 0,
  };
  totals.saldo = totals.facturado - totals.abonos - totals.ajustes;

  const doc = new jsPDF();

  let logo: string | null = null;
  if (empresa?.urlImageLogo) {
    try {
      logo = await getBase64ImageFromURL(empresa.urlImageLogo);
    } catch {
      // Sin logo: el encabezado de texto es suficiente.
    }
  }

  const headEnd = drawMainHeader(doc, empresa, logo);
  const clientEnd = drawCustomerBlock(doc, cliente, headEnd, totals.saldo, rows.length);
  const cardsEnd = drawSummaryCards(doc, totals, clientEnd + 5);
  const detailStart = drawSectionTitle(
    doc,
    'Detalle por cotización facturada',
    'Cada abono indica la transferencia de la que proviene',
    cardsEnd + 7
  );

  const body: RowInput[] = [];
  for (const budget of rows) body.push(...detailRowsFor(budget, movements));

  autoTable(doc, {
    head: [['Cotización', 'Fecha', 'Obra / concepto', 'Nº factura', 'Antig.', 'Total', 'Aplicado', 'Saldo']],
    body,
    foot: [[
      { content: 'Totales del estado de cuenta', colSpan: 5 },
      cop(totals.facturado),
      cop(totals.abonos + totals.ajustes),
      cop(totals.saldo),
    ]],
    startY: detailStart + 2,
    theme: 'plain',
    // Una nota larga nunca se parte entre dos páginas: o cabe entera o baja.
    rowPageBreak: 'avoid',
    margin: { top: CONT_HEAD_H, bottom: FOOT_RESERVE, left: M, right: M },
    tableWidth: CONTENT_W,
    styles: { fontSize: 7, cellPadding: 1.6, overflow: 'linebreak', textColor: INK, valign: 'middle' },
    headStyles: {
      fillColor: PRIMARY_LIGHT, textColor: PRIMARY_DARK, fontStyle: 'bold', fontSize: 6.2,
      lineWidth: { top: 0.3, bottom: 0.3 } as any, lineColor: [226, 220, 245],
    },
    footStyles: {
      fillColor: PRIMARY_LIGHT, textColor: PRIMARY_DARK, fontStyle: 'bold', fontSize: 7.4,
      lineWidth: { top: 0.3 } as any, lineColor: [226, 220, 245],
    },
    columnStyles: DETAIL_COLUMNS,
  });

  drawChrome(doc, empresa, cliente);
  return doc;
}
