# Rediseño "Nueva Cotización" (add-update-budget) — Restyle fiel morado

**Fecha:** 2026-07-25
**Componente:** `src/app/modules/budgets/add-update-budget/`
**Rama:** `feature/nueva-cotizacion-redesign` (git worktree)
**Diseño guía:** Claude Design — `Nueva Cotizacion.dc.html`
(proyecto `9926b45b-94b7-402e-bf87-7da182cd81a7`)

## Objetivo

Reimplementar la pantalla de crear/editar cotización (`AddUpdateBudgetComponent`)
adoptando fielmente el sistema de diseño morado del mockup, **sin alterar el
contrato con el backend ni la lógica de cálculo existente**. El diseño es una
guía visual/estructural; toda la funcionalidad actual se conserva.

## Alcance (decisiones aprobadas)

1. **Restyle fiel sin tocar backend.** Se adopta todo el look morado (header/footer
   sticky, tarjetas, dropdowns con puntos de color, vista móvil en tarjetas, chips
   de notas). El contrato con el backend queda igual.
2. **Se conservan todas las funciones actuales**, integradas al nuevo look:
   Agregar con IA (audio), Desde APU, Desde Producto, Duplicar ítem y Subtotal de sección.
3. **Forma de pago** = dropdown con las 4 opciones del diseño **+ opción
   "Personalizado…"** que revela un input de texto libre (preserva el default largo
   actual). Se **conserva** "Validez de oferta", reubicada en Datos generales.

### Fuera de alcance (explícito)

- **AIU con 3 porcentajes editables** (Admin/Imprev/Utilidad): NO. El modelo del
  backend (`BudgetModel`) no tiene esos campos. Se mantiene la lógica actual:
  toggle `hasAIU` con **10% fijo** y toggle `sumAIU`. IVA se calcula como hoy.
- **Checkbox "Enviar el PDF al cliente al guardar"**: NO (requería backend).
- Cambios en `budget.service.ts`, modelos, o el backend .NET.

## Estado actual relevante (lo que ya existe)

- Formulario reactivo `budgetForm` con: `budgetId`, `externalInvoice`, `userId`,
  `customerId`, `amount`, `date`, `budgetName`, `wayToPay`, `deliveryTime`,
  `validityOffer`, `note`, `estado`, `projectReportId`, `hasIVA`, `hasAIU`,
  `sumAIU`, `budgetDetailsDto` (FormArray).
- Detalle de ítem: `description`, `unitMeasurement`, `quantity`, `price`,
  `subtotal`, `isTitle`.
- Cálculos: `updateAmount()` / `setCalculatesTotals()` (AIU 10%, IVA 19%).
- Features: modal APU (`visible`), modal Producto (`visibleProductModal`),
  grabación de audio (`toggleRecording`), drag&drop (`dragStart/dragOver/drop`),
  capítulos (`addTitleRow`, `isTitle`), subtotal de sección
  (`isLastItemOfSection`, `getSectionSubtotal`), duplicar (`duplicateBudgetDetail`).
- **Ya disponible en el branch:** fuentes Nunito/Nunito Sans (index.html),
  `STATUS_COLORS` con los mismos puntos de color del diseño, componente
  `app-status-pill`, directiva `appThousandSeparator`.

## Estructura visual objetivo (mapeo diseño → componente)

Contenedor centrado (máx ~960px escritorio) sobre fondo lavanda `#eceaf2`, shell
`#f4f4f7` con esquinas redondeadas.

### 1. Header sticky morado (`#6d28d9`)
- Botón ← (volver a `/budgets/budgets`).
- Breadcrumb `Cotizaciones / Nueva` (o `/ Editar` al editar).
- Título: `Cotización #{internalCode}` si existe, si no `titlePage`.
- Botón "Vista previa": visible **solo al editar** (`budgetId`), navega a `read-budget`.

### 2. Tarjeta "Datos generales"
Campos (labels uppercase gris `#8b85a1`, inputs 42px, borde `#e2e0ec`, focus `#a78bfa`):
- **Cliente** — select estilizado (`customerId`), requerido. Mantiene validación actual.
- **Obra** — `budgetName`, requerido.
- **Fecha** — `date` (input type=date).
- **Plazo de entrega** — `deliveryTime` (texto libre, estilizado; sin forzar unidad).
- **Estado** — dropdown personalizado con punto de color. Lista los 7
  `BUDGET_ESTADOS`; color de punto desde `STATUS_COLORS`. Botón que abre panel
  flotante (`estadoOpen`).
- **Forma de pago** — dropdown con: Contado, 50% anticipo, Crédito 30 días,
  Crédito 60 días, **Personalizado…**. "Personalizado…" revela input de texto
  libre ligado a `wayToPay`.
- **Validez de oferta** — `validityOffer` (texto libre).
- **N.º de factura** — `externalInvoice`. Se **habilita** cuando `estado === 'Facturada'`;
  deshabilitado + fondo tenue en otro caso, con texto de ayuda del diseño.

### 3. Tarjeta "Ítems"
- Cabecera: título + badge de conteo (`{n} ítem(s)`) + acciones a la derecha:
  - **Plantilla** → `addBudgetDetailFromAPU()`
  - **Importar** → `addBudgetDetailFromProduct()`
  - **Micrófono IA** → `toggleRecording()` (estado grabando visible)
- **Escritorio** (grid del diseño): `handle · Descripción · Unidad · Cant. ·
  Vr. unitario · Subtotal · ×`. Botón **duplicar** en hover. Inputs inline con
  hover/focus morado. `appThousandSeparator` en precio; `onlyNumbers` en cantidad.
- **Móvil**: tarjeta por ítem (Descripción arriba; grid Und/Cant/Vr; Subtotal al pie).
- **Filas de Capítulo** (`isTitle`) y **Subtotal de sección**
  (`isLastItemOfSection`/`getSectionSubtotal`) conservadas y estilizadas.
- Pie: `+ Agregar ítem` (`addBudgetDetail`) y `+ Capítulo` (`addTitleRow`).
- Empty state cuando no hay ítems.

### 4. Tarjeta "Totales"
- **Panel izquierdo**: toggles estilo interruptor del diseño:
  - IVA 19% → `hasIVA` (`updateCheckStatusIVA`), con hint.
  - Aplicar AIU → `hasAIU` (`updateCheckStatusAIU`).
  - Al activar AIU aparece toggle **"Sumar AIU"** → `sumAIU` (`updateAmount`).
  - (NO se muestran los 3 % editables del diseño.)
- **Panel derecho**: desglose con `formatNumberParts` — Costo directo (`amount`),
  AIU 10% (si `hasAIU`), IVA 19% (si `hasIVA`), y **Total** grande morado (`total`).

### 5. Tarjeta "Notas y condiciones"
- Textarea `note`.
- Chips que **anexan** texto a `note` (helper nuevo `addSnippet(text)`):
  "Anticipo 50%", "Vigencia de precios", "Garantía 12 meses", "No incluye obra civil".
- (Sin checkbox "Enviar PDF".)

### 6. Footer sticky
- Total (grand total, `total`) a la izquierda.
- **Cancelar** (→ `/budgets/budgets`) y **Guardar cotización / Actualizar**
  (`onAddUpdateBudget`, label según `budgetId`).
- Mensajes de error (`showErrors`/`msjError`) conservados.

### Modales y spinner
- Modal APU, modal Producto y `app-confirmation-modal`: re-estilizados al morado.
- `ngx-spinner` sin cambios.

## Cambios por archivo

- **`add-update-budget.component.html`** — reescritura estructural completa a las
  6 secciones + modales. Se mantienen todos los `formControlName`, `(click)`,
  `formArrayName`, validaciones y `*ngIf` de errores existentes.
- **`add-update-budget.component.scss`** — reescritura de estilos con la paleta
  morada y tokens del diseño. Vista escritorio (grid) + vista móvil (tarjetas)
  vía media queries. Sin dependencia de estilos globales nuevos.
- **`add-update-budget.component.ts`** — cambios mínimos:
  - `addSnippet(text: string)`: anexa a `note`.
  - Estado del dropdown de estado (`estadoOpen`) y de forma de pago
    (`pagoMode`/`pagoOpen`) + método para elegir opción o "Personalizado…".
  - Habilitar/deshabilitar `externalInvoice` según `estado` (suscripción a cambios
    de `estado` o handler en el dropdown).
  - Sin cambios en cálculos, servicios ni envío al backend.

## Comportamientos preservados (checklist de no-regresión)

- Crear (sin id): fila vacía inicial + `estado='Cotizada'` por defecto.
- Editar (con id): carga `getById`, `patchValue`, detalles, recalcula total.
- Validaciones: `customerId` > 0, `budgetName` requerido, `quantity` entero,
  `price` patrón numérico; modal de campos incompletos.
- APU/Producto: búsqueda Fuse.js, selección múltiple, agregar a la lista.
- Audio IA: grabación → WAV → backend → agrega ítems.
- Drag&drop reordena; duplicar inserta debajo; capítulos y subtotales de sección.
- Envío `add`/`update` y navegación al listado.

## Aislamiento

Trabajo en git worktree `StarterKit.Frontend.worktrees/nueva-cotizacion-redesign`
(rama `feature/nueva-cotizacion-redesign`, base = HEAD de
`feature/budgets-table-redesign`). Para compilar, `node_modules` se enlaza
(junction Windows) o se instala en el worktree.

## Pruebas / verificación

- `ng build` (o `rtk` equivalente) sin errores.
- Revisión visual escritorio y móvil de cada sección.
- Recorrido manual del checklist de no-regresión (crear, editar, APU, producto,
  audio, drag&drop, capítulos, IVA/AIU, guardar).
- No hay tests unitarios para este componente (consistente con el redesign de
  `list-budget` en el mismo branch).

## Riesgos / notas

- La reescritura del HTML es amplia (~900 líneas); riesgo principal = perder algún
  `formControlName` o handler. Mitigación: checklist de no-regresión y build.
- El dropdown de Estado/Forma de pago personalizado añade estado de UI en el `.ts`;
  mantener mínimo y cerrar paneles al hacer click fuera.
- "Vista previa" depende de la ruta de `read-budget`; verificar el `routerLink`.
