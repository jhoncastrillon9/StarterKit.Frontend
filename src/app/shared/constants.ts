/**
 * Constantes compartidas de la aplicación
 */

/**
 * Estados disponibles para las cotizaciones/presupuestos
 */
export const BUDGET_ESTADOS = [
  'Cotizada',
  'Aprobada',
  'Rechazada',
  'En Desarrollo',
  'Finalizado',
  'Facturada',
  'Pagada'
] as const;

export type BudgetEstado = typeof BUDGET_ESTADOS[number];
