# Rediseño de listados con `<app-data-table>` (enriquecido)

- **Fecha:** 2026-07-26
- **Rama:** `feature/list-pages-redesign` (creada desde `origin/main`)
- **Autor:** Jhon / Claude

## Contexto

El listado de cotizaciones (`/budgets/budgets`) fue rediseñado usando un
componente reutilizable `<app-data-table>` (standalone) más una familia de
componentes UI de apoyo (`app-client-avatar`, `app-status-pill`,
`app-kpi-card`, `app-filter-chips`) y tokens de diseño en
`src/app/shared/ui/_dc-tokens.scss`. Ese trabajo ya está en `main` (PR #4).

El resto de listados de la app siguen con su propio `p-table` + HTML + SCSS
extensos y estilos inconsistentes:

- `/customers/customers` — `listcustomer.component`
- `/products/products` — `list-product.component`
- `/projectreports/projectreports` — `list-project-report.component`
- `/reports/account-statement` — `account-statement.component`
- `/apus/apus` — `list-apu.component`

## Objetivo

Unificar el diseño de estos 5 listados al patrón de budgets **reutilizando el
componente `<app-data-table>`**, conservando el 100% de la lógica de negocio de
cada componente. Aplicar mejoras visuales (avatares, KPIs, estados) donde
aporten valor.

## Principios

1. **Conservar lógica:** los archivos `.ts` mantienen sus servicios, borrado con
   confirmación, descarga de PDF, envío de email, lazy loading y edición inline.
   Solo se añaden/renombran propiedades cuando el componente compartido lo exige
   (p.ej. `tableColumns`, `chipOptions`, handlers de `lazyLoad`).
2. **Reemplazar template, recortar SCSS:** el HTML pasa a `<app-data-table>` con
   `ng-template dtColumn`. El SCSS de cada página se reduce a lo que el
   componente no cubre: badges, avatares y botones de acción, reusando los
   tokens de `_dc-tokens.scss`.
3. **UTF-8:** los archivos actuales tienen mojibake (`Gestión`→`Gesti�n`). Se
   reescriben en UTF-8 correcto.
4. **Reutilizar, no duplicar:** si dos páginas necesitan el mismo estilo de
   botón de acción, se toma el patrón ya existente del listado de budgets.

## Cambio en el componente compartido

`src/app/shared/ui/data-table/data-table.component.{ts,html}`

- El icono de cabecera está hardcodeado a `$` (`<div class="dc-header__icon">$</div>`).
- **Cambio:** nuevo input `headerIcon = input<string>('')`. En el HTML, si
  `headerIcon()` tiene valor se renderiza `<i [class]="headerIcon()"></i>`; si
  no, se mantiene el texto `$` como fallback.
- Budgets no se modifica (usa el fallback). Cada listado nuevo pasa su icono
  FontAwesome.

Este es el único cambio a código compartido. La API existente (`columns`,
`value`, `loading`, `rowKey`, `title`, `subtitle`, `kpis`, `chips`,
`globalFilterFields`, `lazy`, `totalRecords`, salidas `lazyLoad`/`chipChange`/
`searchChange`, slots `dt-actions`/`dt-empty`, directiva `dtColumn`) cubre todos
los casos.

## Diseño por página

Cada página define en su `.ts` un array `tableColumns: DataTableColumn[]` y usa
`<app-data-table>` en el HTML. Se conservan los nombres de métodos y propiedades
existentes salvo indicación.

### 1. customers (`listcustomer`)
- **Modo:** client-side (`[value]="customers"`).
- **Columnas:** NIT (`customId`), Nombre (`customerName`), Email (`email`),
  Dirección (`address`), Acciones.
- **Templates:** Nombre con `<app-client-avatar [name]>`; Email con icono;
  Acciones editar (`/customers/update/:id`) y eliminar (`confirmDeleteCustomer`).
- **Enriquecido:** KPI "Total clientes" = `customers.length`. Icono `fas fa-users`.
- **Conserva:** `loadCustomers`, `clear`, `confirmDeleteCustomer`, `deleteCustomer`,
  modal de confirmación.

### 2. products (`list-product`)
- **Modo:** **lazy** server-side. `[lazy]="true"`, `[totalRecords]="totalRecords"`,
  `(lazyLoad)="onPageChange($event)"`, `[rows]="pageSize"`,
  `rowsPerPageOptions=[10,20,50,100]`.
- **Búsqueda:** server-side; se mantiene `searchValue` + `onSearch()`. Se conecta
  a la salida `searchChange` del componente (o se mantiene el patrón de búsqueda
  del componente y `onSearch` se dispara desde ahí). El `clear(dt)` se sustituye
  por reset de `searchValue` + recarga.
- **Columnas:** Código (`productInternalCode`), Nombre (`name`), Descripción
  (`description`, con tooltip + `truncate`), Precio (`price` via `formatPrice`),
  Acciones.
- **Templates:** Acciones duplicar (`duplicateProduct`), editar (`goToEdit`),
  eliminar (`confirmDelete`).
- **Enriquecido:** KPI "Total productos" = `totalRecords`. Icono `fas fa-boxes`.
- **Conserva:** `onPageChange`, `onSearch`, `duplicateProduct`, `goToEdit`,
  `confirmDelete`, `onModalConfirm`, `formatPrice`.

### 3. project-reports (`list-project-report`)
- **Modo:** client-side.
- **Columnas:** Cod (`projectReportId`), Fecha (`date`), Nombre
  (`projectReportName`), Cod Cotización (`budgetInternalCode`), Cotización
  (`budgetDTO.budgetName`), Cliente (`customerDto.customerName`), Acciones.
- **Templates:** Cliente con `app-client-avatar`; Acciones PDF
  (`downloadProjectReport`), editar (`/projectreports/add/:id`), eliminar
  (`deleteProjectReportWithComfirm`), email (`sendEmailProjectReportWithComfirm`).
- **Enriquecido:** KPI "Total informes". Icono `fas fa-clipboard-list`.
- **Conserva:** modal de confirmación y `app-email-selector-modal` +
  `onEmailsSelected`, `availableEmails`.

### 4. apus (`list-apu`)
- **Modo:** client-side. `rowsPerPageOptions=[25,50,100,500]`, `rows=50`.
- **Columnas:** Cod (`unitPriceAnalysisId`), Capítulo (`subChapterName`), Item
  (`itemName`), Und (`unitMeasurement`), Mano de Obra (`laborCost`), Valor Total
  (`totalPrice`). Sin columna de acciones (igual que hoy).
- **Enriquecido:** KPIs "Total APUs" (`apus.length`) y "Suma valor total"
  (sumatoria de `totalPrice`, calculada en el `.ts`). Icono `fas fa-calculator`.
- **Conserva:** `loadApus`/carga, `clear`, búsqueda global.

### 5. account-statement — conversión completa
Es la más compleja: selector de cliente, edición inline de factura y estado,
guardado por fila, total adeudado y generación de PDF.

- **Se conserva** la card superior "Seleccionar Cliente" (select + botón PDF),
  re-estilizada con los tokens del nuevo diseño.
- La **tabla del estado** pasa a `<app-data-table>` con `[value]="filteredBudgets()"`:
  - Columnas: Código (`internalCode`), Fecha (`date`), Obra (`budgetName`),
    Factura (input inline → `onFacturaChange`), Estado
    (`<app-status-pill>` + edición → `onEstadoChange`), Total (`total`), Guardar
    (botón `saveBudget`, deshabilitado si `!hasChanges(budgetId)`).
  - **Total adeudado** → KPI/subtítulo del componente usando `total()`.
- Estados vacíos: "Selecciona un cliente" (sin selección) y "Sin cotizaciones
  pendientes" (slot `dt-empty`).
- **Conserva:** `onCustomerSelectChange`, `customers()`, `selectedCustomer()`,
  `filteredBudgets()`, `total()`, `onFacturaChange`, `onEstadoChange`,
  `saveBudget`, `hasChanges`, `estadoOptions`, `generarPDF`.
- Si el paginador del componente estorba con pocos registros, se configura un
  `rows` alto o se acepta el footer estándar; no se elimina lógica.

## Wiring de módulos

Cada NgModule objetivo (`CustomersModule`, `ProductsModule`,
`ProjectReportsModule`, `ReportsModule`, `ApusModule`) importa en su array
`imports` los standalone necesarios, igual que `BudgetsModule`:

- Siempre: `DataTableComponent`, `DataTableColumnDirective`.
- Donde aplique: `ClientAvatarComponent` (customers, project-reports),
  `StatusPillComponent` + `OverlayPanelModule` (account-statement).
- `KpiCardComponent`/`FilterChipsComponent` los importa el propio
  `DataTableComponent`; no requieren import directo salvo uso explícito.
- Verificar que cada módulo importe el módulo de pipes (`capitalize`,
  `truncate`) que ya usan los templates actuales.

`account-statement` es standalone o declarado en `ReportsModule`: se ajustará el
import según corresponda tras inspeccionar el módulo.

## SCSS

- Se elimina el grueso del SCSS por página (headers/cards/tablas propios) porque
  el componente los aporta.
- Se conservan/crean estilos mínimos para: badges de código/NIT/unidad, avatar
  (si no se usa `app-client-avatar`), y botones de acción, tomando como
  referencia el SCSS del listado de budgets para mantener consistencia.

## Verificación

1. **Build:** `ng build` (o `npm run build`) en verde, sin errores de template
   ni de imports de módulos.
2. **Revisión visual** de las 5 rutas: cabecera con icono correcto, búsqueda,
   paginación, KPIs, estados vacíos, y que las acciones (editar/eliminar/PDF/
   email/duplicar/guardar) sigan funcionando.
3. **account-statement:** verificar selección de cliente, edición inline,
   habilitación del botón Guardar por cambios, total y PDF.

## Fuera de alcance

- No se tocan formularios add/update ni `read`.
- No se refactoriza lógica de servicios ni modelos.
- Budgets no cambia (salvo que herede el `headerIcon` opcional sin usarlo).
