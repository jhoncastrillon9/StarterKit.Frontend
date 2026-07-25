# Rediseño tabla de presupuestos — `<app-data-table>` reutilizable

**Fecha:** 2026-07-25
**Ruta afectada:** `/#/budgets/budgets` (`ListBudgetComponent`)
**Diseño origen:** Claude Design — "Rediseño tabla de presupuestos" (`Cotizaciones.dc.html`)
**Stack:** Angular 18.2 · PrimeNG 17.18 (tema Lara light-blue, styled mode) · NgModule-based · CoreUI presente

## 1. Objetivo

Aplicar el rediseño morado, compacto y más denso de la vista de Cotizaciones **empaquetándolo como una librería UI reutilizable**, porque el mismo patrón de tabla se reutilizará en otras tablas de la app. La primera consumidora es la vista de presupuestos (`ListBudgetComponent`).

El diseño mantiene todo lo que hoy existe y **añade** tres interacciones nuevas: KPI cards que filtran, chips de filtro segmentado y avatares de cliente.

### Decisiones tomadas (brainstorming)

- **Arquitectura:** wrapper híbrido `<app-data-table>` construido sobre `p-table`, con contrato de datos único (preparado para paginación backend/lazy futura), slots `ng-template` para celdas custom, y piezas presentacionales compartidas. Confirmado por el usuario dado que a futuro se implementará **paginación desde backend** — el wrapper centraliza ese contrato una sola vez.
- **Nuevas features a implementar:** KPI cards como filtros ✅, chips de filtro segmentado ✅, avatares de cliente ✅.
- **Fuera de alcance:** toggle de densidad ❌, selección múltiple + acciones masivas ❌ (requerirían backend), botón Exportar ❌ (se omite; sin handler aún).
- **Paleta:** morado del diseño tal cual — `#6d28d9` + fuentes Nunito / Nunito Sans.
- **Componentes:** standalone (Angular 18), importados en `BudgetsModule`, para reuso en cualquier módulo o vista standalone futura.
- **Ubicación:** `src/app/shared/ui/`.

## 2. Alcance y garantías

- Cambio **aditivo y visual**. Sin cambios de backend.
- **Todo lo que funciona hoy sigue funcionando**: grabación IA ("Crear con IA"), edición inline de factura, dropdown inline de estado con guardado, acciones por fila (editar / PDF / Excel / duplicar / menú de más opciones), diálogos (cronograma, unir, selector de email), modal de confirmación, `ngx-spinner`, `p-toast`.
- Sin `zoneless` ni migración global a signals: se respeta el patrón zone.js/RxJS existente de la app. Los componentes compartidos pueden usar signals internamente.

## 3. Arquitectura de archivos

```
src/app/shared/ui/
  data-table/
    data-table.component.ts | .html | .scss   ← <app-data-table> (standalone)
    data-table.types.ts                        ← DataTableColumn, KpiDef, ChipDef, DataTableLazyEvent
    data-table-column.directive.ts             ← [dtColumn] registra plantilla de celda por field
    data-table.component.spec.ts
  kpi-card/
    kpi-card.component.ts | .html | .scss | .spec.ts
  filter-chips/
    filter-chips.component.ts | .html | .scss | .spec.ts
  status-pill/
    status-pill.component.ts | .html | .scss | .spec.ts
  client-avatar/
    client-avatar.component.ts | .html | .scss | .spec.ts
  _dc-theme.scss    ← tokens morados (--dc-primary:#6d28d9 …) scopeados a .dc-table
```

## 4. Componentes y responsabilidades

### 4.1 `DataTableComponent` (`app-data-table`)

Shell reutilizable sobre PrimeNG `p-table`. Presentacional + orquestación de layout; **no** conoce reglas de negocio de presupuestos.

**Inputs**
- `columns: DataTableColumn[]`
- `value: T[]`
- `loading: boolean`
- `rowKey: string` (ej. `budgetId`)
- `title: string`, `subtitle?: string` (ej. "654 registros · actualizado hoy")
- `kpis: KpiDef[]`
- `chips: ChipDef[]`
- `searchPlaceholder: string`
- `globalFilterFields: string[]`
- `rows: number` (default 20), `rowsPerPageOptions: number[]` (default `[20,40,60,100]`)
- `sortField?`, `sortOrder?`
- Preparación lazy (futuro backend): `lazy: boolean` (default `false`), `totalRecords?: number`

**Outputs**
- `(kpiClick)` → `KpiDef['key']`
- `(chipChange)` → valor del chip
- `(searchChange)` → `string`
- `(lazyLoad)` → `DataTableLazyEvent` (se emite en page/sort/filter cuando `lazy=true`; **seam** para el backend paging futuro)

**Content projection**
- Slot acciones de header: `<ng-content select="[dt-actions]">` (botones "Crear con IA" + "Nueva cotización").
- Plantillas de celda por columna vía directiva estructural `*dtColumn="'field'"` con contexto `let-row`.

**Renderiza**
- Header morado: icono `$`, `title`, `subtitle`, slot de acciones.
- Barra de KPI cards (`app-kpi-card`), horizontal, wrap.
- Toolbar: input de búsqueda (icono + placeholder + botón limpiar), `app-filter-chips`, etiqueta de resultados ("N de M visibles").
- `p-table` con tema morado: headers ordenables con las flechas del diseño (`⇅` / `▲` / `▼`), `rowHover`, paginador con `rowsPerPageOptions` y footer de rango. Densidad **omitida**.
- Celdas: si la columna tiene plantilla `*dtColumn`, se usa; si no, render por defecto (texto; alineado a la derecha si `align:'right'`).

### 4.2 `KpiCardComponent` (`app-kpi-card`)
Inputs: `value`, `label`, `dotColor`, `share?`, `active`. Output: `(cardClick)`. Card clickeable con borde morado activo, barra-punto de color, número tabular grande, label uppercase, share % a la derecha.

### 4.3 `FilterChipsComponent` (`app-filter-chips`)
Inputs: `options: {label,value,count}[]`, `value`. Output: `(valueChange)`. Grupo segmentado tipo pill; el activo con fondo blanco + sombra.

### 4.4 `StatusPillComponent` (`app-status-pill`)
Input: `status`. Pill de solo lectura con mapa de color por estado:
- Cotizada → ámbar (`#fff8e6/#8a5a00/#f6e2b0`, dot `#f0a500`)
- Aprobada → verde (`#eafaf0/#15703f/#c4ecd4`, dot `#1aa35c`)
- Facturada → azul (`#e9f6fd/#0d5c80/#c3e6f5`, dot `#12a0d8`)
- Rechazada / En Desarrollo / Finalizado / Pagada → colores derivados del `getEstadoColor` actual (fallback neutro).

Budgets mantiene su `p-dropdown` para editar el estado y coloca `app-status-pill` en la plantilla `selectedItem` (patrón que ya usa hoy).

### 4.5 `ClientAvatarComponent` (`app-client-avatar`)
Input: `name`. Deriva iniciales (2 primeras palabras > 3 letras) + color determinista de una paleta pequeña (índice por longitud/hash del nombre). Badge 22px redondeado.

## 5. Modelo de columnas y celdas custom (mecanismo de reuso)

```ts
// data-table.types.ts
export interface DataTableColumn {
  field: string;              // clave lógica; también resuelve la plantilla *dtColumn
  header: string;
  sortable?: boolean;         // default false
  align?: 'left' | 'right' | 'center';  // default 'left'
  sortField?: string;         // para p-sortableColumn (ej. 'customerDto.customerName')
  icon?: string;              // clase de icono opcional en el header
  width?: string;
}

export interface KpiDef { key: string; label: string; value: string | number; dotColor: string; share?: string; }
export interface ChipDef { label: string; value: string; count: number; }
export interface DataTableLazyEvent { first: number; rows: number; sortField?: string; sortOrder?: number; globalFilter?: string; }
```

Columnas de presupuestos:
```
internalCode "Código" (sortable, left)
date "Fecha" (sortable)
budgetName "Obra" (sortable)
customerDto.customerName "Cliente" (sortable)
externalInvoice "Factura"
estado "Estado" (sortable)
total "Total" (sortable, right)
acciones "Acciones" (right, no sortable)
```

Celdas custom en la consumidora vía `*dtColumn`:
- `obra`: nombre (capitalize/truncate) + indicador de facturada.
- `cliente`: `app-client-avatar` + nombre.
- `factura`: edición inline existente (span/click → input con blur/enter/escape) + spinner/check.
- `estado`: `p-dropdown` existente con `app-status-pill` en selectedItem/item + spinner/check.
- `total`: formato moneda existente.
- `acciones`: 5 botones existentes (editar / PDF / Excel / duplicar / más).

## 6. Integración en `ListBudgetComponent` (primera consumidora)

**HTML:** `list-budget.component.html` se reescribe para usar `<app-data-table>` + slots `*dtColumn` y `[dt-actions]`. **Todos los diálogos, modales, spinner, toast, `p-menu` y cada handler del `.ts` se conservan tal cual.**

**TS (aditivo):**
- `activeStatusFilter: string` (default `'Todas'`).
- `kpis` (getter): reusa `budgets.length`, `getCountByStatus('Aprobada'|'Cotizada')`, `getCountWithInvoice()`.
- `chips` (getter): `Todas / Cotizada / Aprobada / Facturada` con conteos.
- `filteredBudgets` (getter): `budgets` filtrado por `activeStatusFilter` (**cliente ahora**; conmutately a `(lazyLoad)`→API **después**). "Facturadas" filtra por factura presente.
- `onKpiClick(key)` y `onChipChange(value)` sincronizan `activeStatusFilter`.
- La búsqueda sigue siendo el global filter de `p-table` (vía el input del wrapper).
- Se elimina lógica/markup de densidad (no aplica).

## 7. Theming

- Tokens morados en `_dc-theme.scss`, **scopeados a la clase contenedora `.dc-table`** para que `#6d28d9` y las fuentes Nunito **no** contaminen el resto de la app (que usa Lara light-blue).
- Fuentes Nunito / Nunito Sans añadidas en `index.html` (Google Fonts), como el diseño.
- Estilos de `p-table` (header, filas, hover, paginador, sort icons) sobreescritos dentro de `.dc-table` para lograr la densidad y el look del mockup.

## 8. Testing

- Spec por componente compartido:
  - `kpi-card`: emite `cardClick`; refleja `active`.
  - `filter-chips`: emite `valueChange` con el valor correcto; marca activo.
  - `client-avatar`: iniciales y color deterministas para un nombre dado.
  - `status-pill`: mapea cada estado a su clase/color.
  - `data-table`: renderiza columnas, usa la plantilla `*dtColumn` cuando existe y el default cuando no, dispara sort/paginación.
- Spec de budgets: seleccionar un KPI/chip reduce `filteredBudgets` al estado esperado; "Facturadas" filtra por factura presente.

## 9. Riesgos y mitigaciones

- **Sangrado de theming:** mitigado scopeando a `.dc-table`.
- **Celdas muy custom (factura inline, dropdown estado):** cubiertas por proyección de plantillas; budgets es la tabla más compleja, por lo que valida el diseño del wrapper para el resto.
- **Interacción filtro-estado + búsqueda global:** el filtro por estado se aplica en la consumidora (array que alimenta `[value]`), la búsqueda queda en el global filter de `p-table`; no compiten.
- **Paginación backend futura:** el output `(lazyLoad)` + inputs `lazy/totalRecords` dejan el seam listo sin reescribir consumidoras.

## 10. Fuera de alcance (explícito)

- Selección múltiple / acciones masivas (PDF masivo, cambio de estado masivo, eliminar masivo).
- Toggle de densidad compacta/cómoda.
- Botón Exportar.
- Paginación server-side real (solo se deja el contrato preparado).
