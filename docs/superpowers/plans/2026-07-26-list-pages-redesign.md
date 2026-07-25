# Rediseño de listados con `<app-data-table>` — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar 5 listados (customers, products, project-reports, apus, account-statement) al componente reutilizable `<app-data-table>` conservando su lógica, con mejoras visuales (KPIs, avatares, estados).

**Architecture:** Cada página reemplaza su `<p-table>` propio por `<app-data-table>` (standalone, ya existente y usado por budgets). La lógica de negocio en los `.ts` se conserva; solo se añaden arrays de columnas / KPIs y pequeños helpers de presentación. El SCSS de cada página se recorta a estilos de celda reutilizando el patrón de `budget-history`. Único cambio compartido: parametrizar el icono de cabecera del componente.

**Tech Stack:** Angular (NgModules + componentes standalone), PrimeNG `p-table`, CoreUI, SCSS, FontAwesome.

## Global Constraints

- **Conservar lógica:** no eliminar ni alterar métodos de servicio, borrado con confirmación, PDF, email, lazy loading ni edición inline. Solo añadir propiedades/helpers de presentación.
- **UTF-8:** reescribir cada HTML en UTF-8 correcto (los actuales tienen mojibake: `ó`→`�`).
- **Reutilizar tokens/patrones:** las clases de celda (`code-value`, `action-buttons`, `action-btn`, `empty-content`) siguen el patrón de `src/app/modules/budget-history/list-budget-history/list-budget-history.component.scss`.
- **API del componente compartido** (no cambiar, solo consumir): inputs `columns`, `value`, `loading`, `rowKey`, `title`, `subtitle`, `kpis`, `chips`, `searchPlaceholder`, `showSearch`, `globalFilterFields`, `rows`, `rowsPerPageOptions`, `sortField`, `sortOrder`, `currentPageReportTemplate`, `lazy`, `totalRecords`; outputs `lazyLoad`, `chipChange`, `searchChange`; slots `[dt-actions]` y `[dt-empty]`; directiva `dtColumn`.
- **Tipos compartidos:** `DataTableColumn` y `KpiDef` desde `src/app/shared/ui/data-table/data-table.types`.
- **Componentes standalone a importar según página:** `DataTableComponent` y `DataTableColumnDirective` (siempre); `ClientAvatarComponent` (customers, project-reports); `StatusPillComponent` (account-statement). Rutas:
  - `src/app/shared/ui/data-table/data-table.component`
  - `src/app/shared/ui/data-table/data-table-column.directive`
  - `src/app/shared/ui/client-avatar/client-avatar.component`
  - `src/app/shared/ui/status-pill/status-pill.component`
- **Verificación por tarea:** no hay tests unitarios significativos (los `.spec` solo comprueban `should create`). El entregable verificable de cada tarea es: **build en verde** con `npx ng build --configuration development` y revisión visual de la ruta. Los `.spec` existentes deben seguir compilando.
- **Commits:** frecuentes, uno por tarea. Terminar el mensaje con:
  ```
  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01NYqMhF59xZ83Uimb1wjcdz
  ```

## File Structure

| Archivo | Responsabilidad | Acción |
|---|---|---|
| `shared/ui/data-table/data-table.component.ts` | Añadir input `headerIcon` | Modificar |
| `shared/ui/data-table/data-table.component.html` | Render condicional del icono | Modificar |
| `modules/customers/listcustomer/*.{html,ts,scss}` | Listado clientes | Modificar |
| `modules/customers/customers.module.ts` | Wiring standalone | Modificar |
| `modules/products/list-product/*.{html,ts,scss}` | Listado productos (lazy) | Modificar |
| `modules/products/products.module.ts` | Wiring standalone | Modificar |
| `modules/project-reports/list-project-report/*.{html,ts,scss}` | Listado informes (standalone) | Modificar |
| `modules/apus/list-apu/*.{html,ts,scss}` | Listado APUs (standalone) | Modificar |
| `modules/reports/account-statement/*.{html,ts,scss}` | Estado de cuenta | Modificar |
| `modules/reports/reports.module.ts` | Wiring | Modificar |

---

## Task 1: Parametrizar icono de cabecera en `<app-data-table>`

**Files:**
- Modify: `src/app/shared/ui/data-table/data-table.component.ts`
- Modify: `src/app/shared/ui/data-table/data-table.component.html:4`

**Interfaces:**
- Produces: input `headerIcon = input<string>('')` en `DataTableComponent`. Si tiene valor, la cabecera renderiza `<i [class]="headerIcon()"></i>`; si vacío, mantiene el texto `$` (comportamiento actual de budgets/budget-history).

- [ ] **Step 1: Añadir el input**

En `data-table.component.ts`, junto a los demás `input(...)` (después de `subtitle = input<string>('');`, línea ~26), añadir:

```ts
  headerIcon = input<string>('');
```

- [ ] **Step 2: Render condicional en la cabecera**

En `data-table.component.html`, reemplazar la línea 4:

```html
      <div class="dc-header__icon">$</div>
```

por:

```html
      <div class="dc-header__icon">
        @if (headerIcon()) { <i [class]="headerIcon()"></i> } @else { $ }
      </div>
```

- [ ] **Step 3: Build**

Run: `npx ng build --configuration development`
Expected: build en verde. Budgets y budget-history no pasan `headerIcon`, así que siguen mostrando `$`.

- [ ] **Step 4: Commit**

```bash
git add src/app/shared/ui/data-table/data-table.component.ts src/app/shared/ui/data-table/data-table.component.html
git commit -m "feat(data-table): input opcional headerIcon en la cabecera"
```

---

## Task 2: Migrar listado de clientes (`customers`)

**Files:**
- Modify: `src/app/modules/customers/listcustomer/listcustomer.component.ts`
- Modify: `src/app/modules/customers/listcustomer/listcustomer.component.html`
- Modify: `src/app/modules/customers/listcustomer/listcustomer.component.scss`
- Modify: `src/app/modules/customers/customers.module.ts`

**Interfaces:**
- Consumes: `DataTableColumn`, `KpiDef` (Task Global). Métodos existentes intactos: `clear`, `confirmDeleteCustomer`, `deleteCustomer`, `loadCustomers`.
- Produces: propiedad `tableColumns: DataTableColumn[]` y getter `kpis: KpiDef[]`.

- [ ] **Step 1: Añadir columnas y KPI al `.ts`**

En `listcustomer.component.ts`, añadir imports arriba:

```ts
import { DataTableColumn, KpiDef } from 'src/app/shared/ui/data-table/data-table.types';
```

Dentro de la clase, junto a las propiedades (tras `customers: CustomerModel[] = [];`):

```ts
  tableColumns: DataTableColumn[] = [
    { field: 'customId', header: 'NIT', sortable: true, width: '150px' },
    { field: 'customerName', header: 'Nombre', sortable: true },
    { field: 'email', header: 'Email', sortable: true },
    { field: 'address', header: 'Dirección', sortable: true },
    { field: 'acciones', header: 'Acciones', align: 'right', width: '120px' },
  ];

  get kpis(): KpiDef[] {
    return [{ key: 'total', label: 'Total clientes', value: this.customers.length, dotColor: '#6d28d9' }];
  }
```

- [ ] **Step 2: Reemplazar el HTML**

Reemplazar TODO el contenido de `listcustomer.component.html` por:

```html
<!-- Listado de clientes rediseñado -->
<div class="customer-list-container">
  <app-data-table
    [columns]="tableColumns"
    [value]="customers"
    [loading]="loading"
    rowKey="customerId"
    title="Clientes"
    headerIcon="fas fa-users"
    [subtitle]="customers.length + ' clientes'"
    [kpis]="kpis"
    searchPlaceholder="Buscar cliente..."
    [globalFilterFields]="['customId','customerName','email','address']"
    [rows]="20"
    [rowsPerPageOptions]="[20,40,60,100]"
    sortField="customerName"
    [sortOrder]="1"
    currentPageReportTemplate="{first} al {last} de {totalRecords} clientes">

    <a dt-actions [routerLink]="'/customers/add'" class="btn-new">
      <i class="fas fa-user-plus"></i><span>Nuevo Cliente</span>
    </a>

    <ng-template dtColumn="customId" let-customer>
      <span class="nit-badge">{{ customer.customId }}</span>
    </ng-template>

    <ng-template dtColumn="customerName" let-customer>
      <div class="name-cell">
        <app-client-avatar [name]="customer.customerName"></app-client-avatar>
        <span class="name-text">{{ customer.customerName | capitalize | truncate:60 }}</span>
      </div>
    </ng-template>

    <ng-template dtColumn="email" let-customer>
      <div class="email-cell">
        <i class="fas fa-envelope"></i>
        <span>{{ customer.email | truncate:60 }}</span>
      </div>
    </ng-template>

    <ng-template dtColumn="address" let-customer>
      <span class="address-text">{{ customer.address | capitalize | truncate:60 }}</span>
    </ng-template>

    <ng-template dtColumn="acciones" let-customer>
      <div class="action-buttons">
        <button class="action-btn action-edit" [routerLink]="['/customers/update', customer.customerId]"
          pTooltip="Editar" tooltipPosition="top"><i class="fas fa-pen"></i></button>
        <button class="action-btn action-delete" (click)="confirmDeleteCustomer(customer)"
          pTooltip="Eliminar" tooltipPosition="top"><i class="fas fa-trash-alt"></i></button>
      </div>
    </ng-template>

    <div dt-empty class="empty-content">
      <i class="fas fa-users empty-icon"></i>
      <h3>No hay clientes registrados</h3>
      <p>Comienza agregando tu primer cliente</p>
      <a [routerLink]="'/customers/add'" class="btn-create-first"><i class="fas fa-user-plus"></i> Agregar Cliente</a>
    </div>
  </app-data-table>
</div>

<!-- Modal de confirmación -->
<app-confirmation-modal
  #confirmationModal
  [messageModal]="messageModal"
  [title]="title"
  [isModalError]="isModalError"
  [alignment]="'top'">
</app-confirmation-modal>
```

- [ ] **Step 3: Reemplazar el SCSS por estilos mínimos**

Reemplazar TODO el contenido de `listcustomer.component.scss` por:

```scss
$primary: #6d28d9;
$primary-dark: #5b21b6;
$border: #e2e0ec;
$muted: #7c7691;

:host { display: block; }

.customer-list-container {
  font-family: 'Nunito Sans', system-ui, sans-serif;
  padding: 20px 24px 40px;
  color: #1f1b2e;
}

.btn-new, .btn-create-first {
  display: inline-flex; align-items: center; gap: 8px;
  height: 38px; padding: 0 16px; border-radius: 10px;
  background: $primary; color: #fff; font-weight: 800; font-size: 13px;
  text-decoration: none; border: none; cursor: pointer; transition: background .15s ease;
  &:hover { background: $primary-dark; color: #fff; }
}

.nit-badge {
  font-family: 'Nunito', system-ui, sans-serif;
  font-weight: 800; color: $primary; font-variant-numeric: tabular-nums;
}

.name-cell { display: flex; align-items: center; gap: 10px; }
.name-text { font-weight: 700; color: #1f1b2e; }

.email-cell {
  display: flex; align-items: center; gap: 7px; color: #6f6987; font-size: 12.5px;
  i { color: #a78bfa; font-size: 12px; }
}

.address-text { color: #55506d; font-size: 13px; }

.action-buttons { display: flex; align-items: center; justify-content: flex-end; gap: 4px; }
.action-btn {
  display: flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border-radius: 8px; border: 1px solid #e6e3f0;
  background: #fff; color: #6f6987; cursor: pointer; transition: all .15s ease;
  i { font-size: 0.85rem; }
  &.action-edit:hover   { background: #f1eefe; border-color: #cbbcf9; color: $primary-dark; }
  &.action-delete:hover { background: #fdeeee; border-color: #f3c9c4; color: #c0392b; }
}

.empty-content {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 40px 20px; text-align: center;
  .empty-icon { font-size: 2.5rem; color: #d5d2e0; }
  h3 { margin: 0; font-family: 'Nunito', system-ui, sans-serif; font-weight: 800; color: #4b4560; }
  p  { margin: 0; font-size: 13px; color: $muted; }
  .btn-create-first { margin-top: 6px; }
}

@media (max-width: 768px) { .customer-list-container { padding: 14px 12px 30px; } }
```

- [ ] **Step 4: Wiring del módulo**

En `customers.module.ts`, añadir imports arriba:

```ts
import { DataTableComponent } from 'src/app/shared/ui/data-table/data-table.component';
import { DataTableColumnDirective } from 'src/app/shared/ui/data-table/data-table-column.directive';
import { ClientAvatarComponent } from 'src/app/shared/ui/client-avatar/client-avatar.component';
```

Y añadir al array `imports` del `@NgModule` (después de `ChipsModule`):

```ts
    DataTableComponent,
    DataTableColumnDirective,
    ClientAvatarComponent,
```

`RouterModule` ya está disponible vía `CustomersRoutingModule`; `pTooltip`, `capitalize` y `truncate` ya funcionan (módulo importa `SharedModule` de CoreUI y `CustomSharedModule`/pipes).

- [ ] **Step 5: Build**

Run: `npx ng build --configuration development`
Expected: verde. Verificar manualmente `/#/customers/customers`: cabecera con icono usuarios, KPI, búsqueda, avatares, acciones editar/eliminar, estado vacío.

- [ ] **Step 6: Commit**

```bash
git add src/app/modules/customers
git commit -m "feat(customers): migrar listado a <app-data-table>"
```

---

## Task 3: Migrar listado de productos (`products`, lazy)

**Files:**
- Modify: `src/app/modules/products/list-product/list-product.component.ts`
- Modify: `src/app/modules/products/list-product/list-product.component.html`
- Modify: `src/app/modules/products/list-product/list-product.component.scss`
- Modify: `src/app/modules/products/products.module.ts`

**Interfaces:**
- Consumes: `DataTableColumn`, `KpiDef`. Métodos existentes intactos: `onPageChange(event)` (usa `event.first`/`event.rows`), `onSearch()`, `duplicateProduct`, `goToEdit`, `confirmDelete`, `onModalConfirm`, `formatPrice`.
- Produces: `tableColumns: DataTableColumn[]`, getter `kpis`, método `onSearchChange(v: string)`.

- [ ] **Step 1: Columnas, KPI y handler de búsqueda en el `.ts`**

Añadir import:

```ts
import { DataTableColumn, KpiDef } from 'src/app/shared/ui/data-table/data-table.types';
```

Dentro de la clase (tras `products: Product[] = [];`):

```ts
  tableColumns: DataTableColumn[] = [
    { field: 'productInternalCode', header: 'Código', sortable: true, width: '140px' },
    { field: 'name', header: 'Nombre', sortable: true },
    { field: 'description', header: 'Descripción', sortable: true },
    { field: 'price', header: 'Precio', sortable: true, align: 'right', width: '160px' },
    { field: 'acciones', header: 'Acciones', align: 'right', width: '150px' },
  ];

  get kpis(): KpiDef[] {
    return [{ key: 'total', label: 'Total productos', value: this.totalRecords, dotColor: '#6d28d9' }];
  }

  onSearchChange(value: string): void {
    this.searchValue = value;
    this.onSearch();
  }
```

> Nota: la búsqueda pasa a ser instantánea (por tecleo) en vez de por botón; aprobado en el diseño. `onSearch()` ya resetea a página 1 y recarga.

- [ ] **Step 2: Reemplazar el HTML**

Reemplazar TODO el contenido de `list-product.component.html` por:

```html
<!-- Listado de productos rediseñado (lazy) -->
<div class="product-list-container">
  <app-data-table
    [columns]="tableColumns"
    [value]="products"
    [loading]="loading"
    rowKey="productId"
    title="Productos"
    headerIcon="fas fa-boxes"
    [subtitle]="totalRecords + ' productos'"
    [kpis]="kpis"
    searchPlaceholder="Buscar por nombre, código, descripción..."
    [lazy]="true"
    [totalRecords]="totalRecords"
    [rows]="pageSize"
    [rowsPerPageOptions]="[10,20,50,100]"
    currentPageReportTemplate="{first} al {last} de {totalRecords} productos"
    (searchChange)="onSearchChange($event)"
    (lazyLoad)="onPageChange($event)">

    <a dt-actions [routerLink]="'/products/add'" class="btn-new">
      <i class="fas fa-plus"></i><span>Nuevo Producto</span>
    </a>

    <ng-template dtColumn="productInternalCode" let-product>
      <span class="code-value">{{ product.productInternalCode }}</span>
    </ng-template>

    <ng-template dtColumn="name" let-product>
      <span class="product-name">{{ product.name }}</span>
    </ng-template>

    <ng-template dtColumn="description" let-product>
      <span class="product-description" [pTooltip]="product.description" tooltipPosition="top">
        {{ product.description | truncate:50 }}
      </span>
    </ng-template>

    <ng-template dtColumn="price" let-product>
      <span class="price-badge">{{ formatPrice(product.price) }}</span>
    </ng-template>

    <ng-template dtColumn="acciones" let-product>
      <div class="action-buttons">
        <button class="action-btn action-duplicate" (click)="duplicateProduct(product)"
          pTooltip="Duplicar" tooltipPosition="top"><i class="fas fa-copy"></i></button>
        <button class="action-btn action-edit" (click)="goToEdit(product)"
          pTooltip="Editar" tooltipPosition="top"><i class="fas fa-pencil-alt"></i></button>
        <button class="action-btn action-delete" (click)="confirmDelete(product)"
          pTooltip="Eliminar" tooltipPosition="top"><i class="fas fa-trash-alt"></i></button>
      </div>
    </ng-template>

    <div dt-empty class="empty-content">
      <i class="fas fa-box-open empty-icon"></i>
      <h3>No se encontraron productos</h3>
      <p>Intenta con otros términos de búsqueda o crea un nuevo producto</p>
      <a [routerLink]="'/products/add'" class="btn-create-first"><i class="fas fa-plus"></i> Nuevo Producto</a>
    </div>
  </app-data-table>
</div>

<!-- Modal de Confirmación -->
<app-confirmation-modal
  #confirmationModal
  [title]="title"
  [messageModal]="messageModal"
  [isModalError]="isModalError"
  [isConfirmation]="isModalForDelete"
  [titleButtonComfimationYes]="'Eliminar'"
  (confirmAction)="onModalConfirm()">
</app-confirmation-modal>

<ngx-spinner bdColor="rgba(0, 0, 0, 0.8)" size="medium" color="#fff" type="ball-clip-rotate" [fullScreen]="true">
  <p style="color: white">Cargando...</p>
</ngx-spinner>
```

- [ ] **Step 3: Reemplazar el SCSS por estilos mínimos**

Reemplazar TODO el contenido de `list-product.component.scss` por:

```scss
$primary: #6d28d9;
$primary-dark: #5b21b6;
$muted: #7c7691;

:host { display: block; }

.product-list-container {
  font-family: 'Nunito Sans', system-ui, sans-serif;
  padding: 20px 24px 40px;
  color: #1f1b2e;
}

.btn-new, .btn-create-first {
  display: inline-flex; align-items: center; gap: 8px;
  height: 38px; padding: 0 16px; border-radius: 10px;
  background: $primary; color: #fff; font-weight: 800; font-size: 13px;
  text-decoration: none; border: none; cursor: pointer; transition: background .15s ease;
  &:hover { background: $primary-dark; color: #fff; }
}

.code-value { font-family: 'Nunito', system-ui, sans-serif; font-weight: 800; color: $primary; font-variant-numeric: tabular-nums; }
.product-name { font-weight: 700; color: #1f1b2e; }
.product-description { color: #6f6987; font-size: 13px; }
.price-badge { font-weight: 800; color: #15703f; font-variant-numeric: tabular-nums; }

.action-buttons { display: flex; align-items: center; justify-content: flex-end; gap: 4px; }
.action-btn {
  display: flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border-radius: 8px; border: 1px solid #e6e3f0;
  background: #fff; color: #6f6987; cursor: pointer; transition: all .15s ease;
  i { font-size: 0.85rem; }
  &.action-duplicate:hover { background: #eef4fd; border-color: #bcd4f6; color: #1d4ed8; }
  &.action-edit:hover      { background: #f1eefe; border-color: #cbbcf9; color: $primary-dark; }
  &.action-delete:hover    { background: #fdeeee; border-color: #f3c9c4; color: #c0392b; }
}

.empty-content {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 40px 20px; text-align: center;
  .empty-icon { font-size: 2.5rem; color: #d5d2e0; }
  h3 { margin: 0; font-family: 'Nunito', system-ui, sans-serif; font-weight: 800; color: #4b4560; }
  p  { margin: 0; font-size: 13px; color: $muted; }
  .btn-create-first { margin-top: 6px; }
}

@media (max-width: 768px) { .product-list-container { padding: 14px 12px 30px; } }
```

- [ ] **Step 4: Wiring del módulo**

En `products.module.ts`, añadir imports:

```ts
import { RouterModule } from '@angular/router';
import { DataTableComponent } from 'src/app/shared/ui/data-table/data-table.component';
import { DataTableColumnDirective } from 'src/app/shared/ui/data-table/data-table-column.directive';
```

Y al array `imports` (después de `CustomSharedModule`):

```ts
    RouterModule,
    DataTableComponent,
    DataTableColumnDirective,
```

> `RouterModule` es necesario porque el nuevo HTML usa `[routerLink]` para "Nuevo Producto". `TooltipModule` ya está importado. Pipes `truncate` disponibles vía `CustomSharedModule`.

- [ ] **Step 5: Build**

Run: `npx ng build --configuration development`
Expected: verde. Verificar `/#/products/products`: KPI total, búsqueda server-side (recarga al teclear), paginación lazy (cambiar página/tamaño recarga), acciones duplicar/editar/eliminar, estado vacío.

- [ ] **Step 6: Commit**

```bash
git add src/app/modules/products
git commit -m "feat(products): migrar listado lazy a <app-data-table>"
```

---

## Task 4: Migrar listado de informes de obra (`project-reports`, standalone)

**Files:**
- Modify: `src/app/modules/project-reports/list-project-report/list-project-report.component.ts`
- Modify: `src/app/modules/project-reports/list-project-report/list-project-report.component.html`
- Modify: `src/app/modules/project-reports/list-project-report/list-project-report.component.scss`

**Interfaces:**
- Consumes: `DataTableColumn`, `KpiDef`. Métodos intactos: `downloadProjectReport`, `deleteProjectReportWithComfirm`, `sendEmailProjectReportWithComfirm`, `onEmailsSelected`, `clear`, `fetchProjectReports`.
- Produces: `tableColumns`, getter `kpis`.
- Nota: componente **standalone** — los imports van en el array `imports` del `@Component`, no en un NgModule.

- [ ] **Step 1: Columnas, KPI e imports standalone en el `.ts`**

Añadir imports arriba:

```ts
import { TooltipModule } from 'primeng/tooltip';
import { DataTableComponent } from 'src/app/shared/ui/data-table/data-table.component';
import { DataTableColumnDirective } from 'src/app/shared/ui/data-table/data-table-column.directive';
import { ClientAvatarComponent } from 'src/app/shared/ui/client-avatar/client-avatar.component';
import { DataTableColumn, KpiDef } from 'src/app/shared/ui/data-table/data-table.types';
```

Añadir esos 4 componentes/módulos al final del array `imports` del `@Component`:

```ts
    TooltipModule, DataTableComponent, DataTableColumnDirective, ClientAvatarComponent
```

Dentro de la clase (tras `projectReports: ProjectReportModel[] = [];`):

```ts
  tableColumns: DataTableColumn[] = [
    { field: 'projectReportId', header: 'Cod', sortable: true, width: '90px' },
    { field: 'date', header: 'Fecha', sortable: true, width: '130px' },
    { field: 'projectReportName', header: 'Nombre', sortable: true },
    { field: 'budgetInternalCode', header: 'Cod Cotización', sortable: true, width: '150px' },
    { field: 'budgetDTO.budgetName', header: 'Cotización', sortable: true },
    { field: 'customerDto.customerName', header: 'Cliente', sortable: true },
    { field: 'acciones', header: 'Acciones', align: 'right', width: '180px' },
  ];

  get kpis(): KpiDef[] {
    return [{ key: 'total', label: 'Total informes', value: this.projectReports.length, dotColor: '#6d28d9' }];
  }
```

- [ ] **Step 2: Reemplazar el HTML**

Reemplazar TODO el contenido de `list-project-report.component.html` por:

```html
<!-- Listado de informes de obra rediseñado -->
<div class="project-report-list-container">
  <app-data-table
    [columns]="tableColumns"
    [value]="projectReports"
    [loading]="loading"
    rowKey="projectReportId"
    title="Informes de Obra"
    headerIcon="fas fa-clipboard-list"
    [subtitle]="projectReports.length + ' informes'"
    [kpis]="kpis"
    searchPlaceholder="Buscar por nombre, cliente, cotización..."
    [globalFilterFields]="['projectReportName','note','projectReportId','internalCode','customerDto.customerName','budgetDTO.budgetName']"
    [rows]="50"
    [rowsPerPageOptions]="[25,50,100,500]"
    sortField="projectReportId"
    [sortOrder]="-1"
    currentPageReportTemplate="{first} al {last} de {totalRecords} informes">

    <a dt-actions [routerLink]="'/projectreports/add'" class="btn-new">
      <i class="fas fa-plus"></i><span>Nuevo Informe</span>
    </a>

    <ng-template dtColumn="projectReportId" let-report>
      <span class="code-value">{{ report.projectReportId }}</span>
    </ng-template>

    <ng-template dtColumn="date" let-report>
      <span class="date-value">{{ report.date | date:'dd MMM yyyy' }}</span>
    </ng-template>

    <ng-template dtColumn="projectReportName" let-report>
      <span class="report-name">{{ report.projectReportName | truncate:50 }}</span>
    </ng-template>

    <ng-template dtColumn="budgetInternalCode" let-report>
      <span class="budget-code-badge">{{ report.budgetInternalCode }}</span>
    </ng-template>

    <ng-template dtColumn="budgetDTO.budgetName" let-report>
      <span class="budget-name">{{ report.budgetDTO.budgetName | truncate:50 }}</span>
    </ng-template>

    <ng-template dtColumn="customerDto.customerName" let-report>
      <div class="customer-cell">
        <app-client-avatar [name]="report.customerDto.customerName"></app-client-avatar>
        <span class="customer-name">{{ report.customerDto.customerName | truncate:30 }}</span>
      </div>
    </ng-template>

    <ng-template dtColumn="acciones" let-report>
      <div class="action-buttons">
        <button class="action-btn action-download" (click)="downloadProjectReport(report)"
          pTooltip="Descargar PDF" tooltipPosition="top"><i class="fas fa-download"></i></button>
        <button class="action-btn action-edit" [routerLink]="['/projectreports/add', report.projectReportId]"
          pTooltip="Editar" tooltipPosition="top"><i class="fas fa-edit"></i></button>
        <button class="action-btn action-email" (click)="sendEmailProjectReportWithComfirm(report)"
          pTooltip="Enviar por email" tooltipPosition="top"><i class="fas fa-paper-plane"></i></button>
        <button class="action-btn action-delete" (click)="deleteProjectReportWithComfirm(report)"
          pTooltip="Eliminar" tooltipPosition="top"><i class="fas fa-trash-alt"></i></button>
      </div>
    </ng-template>

    <div dt-empty class="empty-content">
      <i class="fas fa-clipboard-list empty-icon"></i>
      <h3>No hay informes de obra</h3>
      <p>Crea tu primer informe de obra para comenzar</p>
      <a [routerLink]="'/projectreports/add'" class="btn-create-first"><i class="fas fa-plus"></i> Crear Informe</a>
    </div>
  </app-data-table>
</div>

<!-- Modal de confirmación -->
<app-confirmation-modal
  #confirmationModal
  [messageModal]="messageModal"
  [title]="title"
  [isModalError]="isModalError"
  [alignment]="'top'">
</app-confirmation-modal>

<!-- Modal de selección de emails -->
<app-email-selector-modal
  #emailSelectorModal
  [emails]="availableEmails"
  (confirmAction)="onEmailsSelected($event)">
</app-email-selector-modal>
```

- [ ] **Step 3: Reemplazar el SCSS por estilos mínimos**

Reemplazar TODO el contenido de `list-project-report.component.scss` por:

```scss
$primary: #6d28d9;
$primary-dark: #5b21b6;
$muted: #7c7691;

:host { display: block; }

.project-report-list-container {
  font-family: 'Nunito Sans', system-ui, sans-serif;
  padding: 20px 24px 40px;
  color: #1f1b2e;
}

.btn-new, .btn-create-first {
  display: inline-flex; align-items: center; gap: 8px;
  height: 38px; padding: 0 16px; border-radius: 10px;
  background: $primary; color: #fff; font-weight: 800; font-size: 13px;
  text-decoration: none; border: none; cursor: pointer; transition: background .15s ease;
  &:hover { background: $primary-dark; color: #fff; }
}

.code-value, .budget-code-badge { font-family: 'Nunito', system-ui, sans-serif; font-weight: 800; color: $primary; font-variant-numeric: tabular-nums; }
.date-value { font-size: 12.5px; font-weight: 700; color: #55506d; }
.report-name, .budget-name { font-weight: 700; color: #1f1b2e; }
.customer-cell { display: flex; align-items: center; gap: 10px; }
.customer-name { font-weight: 700; color: #1f1b2e; }

.action-buttons { display: flex; align-items: center; justify-content: flex-end; gap: 4px; }
.action-btn {
  display: flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border-radius: 8px; border: 1px solid #e6e3f0;
  background: #fff; color: #6f6987; cursor: pointer; transition: all .15s ease;
  i { font-size: 0.85rem; }
  &.action-download:hover { background: #fdeeee; border-color: #f3c9c4; color: #c0392b; }
  &.action-edit:hover     { background: #f1eefe; border-color: #cbbcf9; color: $primary-dark; }
  &.action-email:hover    { background: #eef4fd; border-color: #bcd4f6; color: #1d4ed8; }
  &.action-delete:hover   { background: #fdeeee; border-color: #f3c9c4; color: #c0392b; }
}

.empty-content {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 40px 20px; text-align: center;
  .empty-icon { font-size: 2.5rem; color: #d5d2e0; }
  h3 { margin: 0; font-family: 'Nunito', system-ui, sans-serif; font-weight: 800; color: #4b4560; }
  p  { margin: 0; font-size: 13px; color: $muted; }
  .btn-create-first { margin-top: 6px; }
}

@media (max-width: 768px) { .project-report-list-container { padding: 14px 12px 30px; } }
```

- [ ] **Step 4: Build**

Run: `npx ng build --configuration development`
Expected: verde. Verificar `/#/projectreports/projectreports`: KPI, búsqueda, avatar en cliente, acciones PDF/editar/email/eliminar, modal de emails funcional.

- [ ] **Step 5: Commit**

```bash
git add src/app/modules/project-reports
git commit -m "feat(project-reports): migrar listado a <app-data-table>"
```

---

## Task 5: Migrar listado de APUs (`apus`, standalone)

**Files:**
- Modify: `src/app/modules/apus/list-apu/list-apu.component.ts`
- Modify: `src/app/modules/apus/list-apu/list-apu.component.html`
- Modify: `src/app/modules/apus/list-apu/list-apu.component.scss`

**Interfaces:**
- Consumes: `DataTableColumn`, `KpiDef`. Métodos intactos: `loadApus`, `clear`.
- Produces: `tableColumns`, getters `sumTotal` y `kpis`.
- Nota: componente **standalone**.

- [ ] **Step 1: Columnas, KPIs e imports standalone en el `.ts`**

Añadir imports:

```ts
import { DataTableComponent } from 'src/app/shared/ui/data-table/data-table.component';
import { DataTableColumnDirective } from 'src/app/shared/ui/data-table/data-table-column.directive';
import { DataTableColumn, KpiDef } from 'src/app/shared/ui/data-table/data-table.types';
```

Añadir al final del array `imports` del `@Component`:

```ts
    DataTableComponent, DataTableColumnDirective
```

Dentro de la clase (tras `apus: ApuModel[] = [];`):

```ts
  tableColumns: DataTableColumn[] = [
    { field: 'unitPriceAnalysisId', header: 'Cod', sortable: true, width: '80px' },
    { field: 'subChapterName', header: 'Capítulo', sortable: true },
    { field: 'itemName', header: 'Item', sortable: true },
    { field: 'unitMeasurement', header: 'Und', sortable: true, width: '100px' },
    { field: 'laborCost', header: 'Mano de Obra', sortable: true, align: 'right', width: '150px' },
    { field: 'totalPrice', header: 'Valor Total', sortable: true, align: 'right', width: '150px' },
  ];

  get sumTotal(): number {
    return this.apus.reduce((s, a) => s + (a.totalPrice ?? 0), 0);
  }

  get kpis(): KpiDef[] {
    return [
      { key: 'count', label: 'Total APUs', value: this.apus.length, dotColor: '#6d28d9' },
      { key: 'sum', label: 'Suma valor total', value: '$ ' + this.sumTotal.toLocaleString('es-ES', { maximumFractionDigits: 0 }), dotColor: '#1aa35c' },
    ];
  }
```

- [ ] **Step 2: Reemplazar el HTML**

Reemplazar TODO el contenido de `list-apu.component.html` por:

```html
<!-- Listado de APUs rediseñado -->
<div class="apu-list-container">
  <app-data-table
    [columns]="tableColumns"
    [value]="apus"
    [loading]="loading"
    rowKey="unitPriceAnalysisId"
    title="Análisis de Precios Unitarios"
    headerIcon="fas fa-calculator"
    [subtitle]="apus.length + ' APUs'"
    [kpis]="kpis"
    searchPlaceholder="Buscar APU..."
    [globalFilterFields]="['itemName','subChapterName']"
    [rows]="50"
    [rowsPerPageOptions]="[25,50,100,500]"
    sortField="itemName"
    [sortOrder]="1"
    currentPageReportTemplate="{first} al {last} de {totalRecords} APUs">

    <ng-template dtColumn="unitPriceAnalysisId" let-apu>
      <span class="code-value">{{ apu.unitPriceAnalysisId }}</span>
    </ng-template>

    <ng-template dtColumn="subChapterName" let-apu>
      <span class="chapter-text">{{ apu.subChapterName | capitalize | truncate:50 }}</span>
    </ng-template>

    <ng-template dtColumn="itemName" let-apu>
      <span class="item-name">{{ apu.itemName | capitalize }}</span>
    </ng-template>

    <ng-template dtColumn="unitMeasurement" let-apu>
      <span class="unit-badge">{{ apu.unitMeasurement }}</span>
    </ng-template>

    <ng-template dtColumn="laborCost" let-apu>
      <span class="price-text">$ {{ apu.laborCost.toLocaleString('es-ES') }}</span>
    </ng-template>

    <ng-template dtColumn="totalPrice" let-apu>
      <span class="price-total">$ {{ apu.totalPrice.toLocaleString('es-ES') }}</span>
    </ng-template>

    <div dt-empty class="empty-content">
      <i class="fas fa-calculator empty-icon"></i>
      <h3>No hay APUs disponibles</h3>
      <p>No se encontraron análisis de precios unitarios</p>
    </div>
  </app-data-table>
</div>

<!-- Modal de confirmación -->
<app-confirmation-modal
  #confirmationModal
  [messageModal]="messageModal"
  [title]="title"
  [isModalError]="isModalError"
  [alignment]="'top'">
</app-confirmation-modal>
```

- [ ] **Step 3: Reemplazar el SCSS por estilos mínimos**

Reemplazar TODO el contenido de `list-apu.component.scss` por:

```scss
$primary: #6d28d9;
$muted: #7c7691;

:host { display: block; }

.apu-list-container {
  font-family: 'Nunito Sans', system-ui, sans-serif;
  padding: 20px 24px 40px;
  color: #1f1b2e;
}

.code-value { font-family: 'Nunito', system-ui, sans-serif; font-weight: 800; color: $primary; font-variant-numeric: tabular-nums; }
.chapter-text { color: #55506d; font-size: 13px; }
.item-name { font-weight: 700; color: #1f1b2e; }
.unit-badge {
  display: inline-block; padding: 2px 9px; border-radius: 999px;
  background: #f2f1f7; color: #5b5670; font-size: 12px; font-weight: 700;
}
.price-text { color: #55506d; font-variant-numeric: tabular-nums; }
.price-total { font-weight: 800; color: #15703f; font-variant-numeric: tabular-nums; }

.empty-content {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 40px 20px; text-align: center;
  .empty-icon { font-size: 2.5rem; color: #d5d2e0; }
  h3 { margin: 0; font-family: 'Nunito', system-ui, sans-serif; font-weight: 800; color: #4b4560; }
  p  { margin: 0; font-size: 13px; color: $muted; }
}

@media (max-width: 768px) { .apu-list-container { padding: 14px 12px 30px; } }
```

- [ ] **Step 4: Build**

Run: `npx ng build --configuration development`
Expected: verde. Verificar `/#/apus/apus`: 2 KPIs (conteo y suma), búsqueda, columnas de precios alineadas a la derecha, estado vacío.

- [ ] **Step 5: Commit**

```bash
git add src/app/modules/apus
git commit -m "feat(apus): migrar listado a <app-data-table>"
```

---

## Task 6: Conversión completa de Estado de Cuenta (`account-statement`)

**Files:**
- Modify: `src/app/modules/reports/account-statement/account-statement.component.ts`
- Modify: `src/app/modules/reports/account-statement/account-statement.component.html`
- Modify: `src/app/modules/reports/account-statement/account-statement.component.scss`
- Modify: `src/app/modules/reports/reports.module.ts`

**Interfaces:**
- Consumes: `DataTableColumn`, `KpiDef`. Signals/métodos intactos: `customers()`, `selectedCustomer()`, `filteredBudgets()`, `total()`, `estadoOptions`, `onCustomerSelectChange`, `onFacturaChange`, `onEstadoChange`, `saveBudget`, `hasChanges`, `generarPDF`.
- Produces: `tableColumns`, getter `statementKpis`, propiedad `currentStatementBudget`, métodos `displayFacturaFor`, `displayEstadoFor`, `selectEstadoStatement`.

- [ ] **Step 1: Columnas, KPI y helpers de presentación en el `.ts`**

Añadir imports:

```ts
import { DataTableColumn, KpiDef } from '../../../shared/ui/data-table/data-table.types';
```

Dentro de la clase (tras `estadoOptions = BUDGET_ESTADOS;`):

```ts
  currentStatementBudget: BudgetModel | null = null;

  tableColumns: DataTableColumn[] = [
    { field: 'internalCode', header: 'Código', width: '110px' },
    { field: 'date', header: 'Fecha', width: '130px' },
    { field: 'budgetName', header: 'Obra' },
    { field: 'externalInvoice', header: 'Factura', width: '150px' },
    { field: 'estado', header: 'Estado', width: '170px' },
    { field: 'total', header: 'Total', align: 'right', width: '150px' },
    { field: 'acciones', header: 'Guardar', align: 'center', width: '90px' },
  ];

  get statementKpis(): KpiDef[] {
    return [{
      key: 'debt',
      label: 'Total adeudado',
      value: '$ ' + this.total().toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
      dotColor: '#e5484d',
    }];
  }

  displayFacturaFor(b: BudgetModel): string {
    return this.editedBudgets.get(b.budgetId)?.externalInvoice ?? b.externalInvoice ?? '';
  }

  displayEstadoFor(b: BudgetModel): string {
    return this.editedBudgets.get(b.budgetId)?.estado ?? b.estado ?? '';
  }

  selectEstadoStatement(value: string): void {
    if (this.currentStatementBudget) {
      this.onEstadoChange(this.currentStatementBudget.budgetId, value);
    }
  }
```

- [ ] **Step 2: Reemplazar el HTML**

Reemplazar TODO el contenido de `account-statement.component.html` por:

```html
<!-- Estado de Cuenta rediseñado -->
<div class="account-statement-container">
  <!-- Card selector de cliente -->
  <div class="ac-card">
    <div class="ac-card__head"><i class="fas fa-user-tie"></i><span>Seleccionar Cliente</span></div>
    <div class="ac-card__body">
      <div class="ac-field">
        <label for="customerSelect"><i class="fas fa-users"></i> Cliente</label>
        <select id="customerSelect" class="ac-select" (change)="onCustomerSelectChange($event)">
          <option value="">-- Seleccione un cliente --</option>
          <option *ngFor="let customer of customers()" [value]="customer.customerId">
            {{ customer.customerName }}
          </option>
        </select>
      </div>
    </div>
  </div>

  <!-- Tabla del estado de cuenta -->
  <app-data-table *ngIf="selectedCustomer()"
    [columns]="tableColumns"
    [value]="filteredBudgets()"
    [loading]="false"
    rowKey="budgetId"
    [title]="'Estado de Cuenta: ' + (selectedCustomer()?.customerName || '')"
    headerIcon="fas fa-file-invoice-dollar"
    [subtitle]="filteredBudgets().length + ' cotizaciones'"
    [kpis]="statementKpis"
    [showSearch]="false"
    [rows]="100"
    [rowsPerPageOptions]="[50,100,200]"
    currentPageReportTemplate="{first} al {last} de {totalRecords}">

    <button dt-actions class="btn-pdf" (click)="generarPDF()">
      <i class="fas fa-file-pdf"></i><span>Generar PDF</span>
    </button>

    <ng-template dtColumn="internalCode" let-budget>
      <span class="code-value">{{ budget.internalCode }}</span>
    </ng-template>

    <ng-template dtColumn="date" let-budget>
      <span class="date-value">{{ budget.date | date:'dd MMM yyyy' }}</span>
    </ng-template>

    <ng-template dtColumn="budgetName" let-budget>
      <span class="obra-name">{{ budget.budgetName }}</span>
    </ng-template>

    <ng-template dtColumn="externalInvoice" let-budget>
      <input type="text" class="ac-input-sm" [value]="displayFacturaFor(budget)"
        (input)="onFacturaChange(budget.budgetId, $any($event.target).value)" placeholder="Nº Factura" />
    </ng-template>

    <ng-template dtColumn="estado" let-budget>
      <button type="button" class="status-trigger"
        (click)="currentStatementBudget = budget; estadoPanel.toggle($event)">
        <app-status-pill [status]="displayEstadoFor(budget)" [caret]="true"></app-status-pill>
      </button>
    </ng-template>

    <ng-template dtColumn="total" let-budget>
      <span class="total-value">$ {{ budget.total.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }}</span>
    </ng-template>

    <ng-template dtColumn="acciones" let-budget>
      <button class="action-btn action-save" (click)="saveBudget(budget)"
        [disabled]="!hasChanges(budget.budgetId)" pTooltip="Guardar cambios" tooltipPosition="top">
        <i class="fas fa-save"></i>
      </button>
    </ng-template>

    <div dt-empty class="empty-content">
      <i class="fas fa-inbox empty-icon"></i>
      <h3>Sin cotizaciones pendientes</h3>
      <p>Este cliente no tiene cotizaciones con factura registrada</p>
    </div>
  </app-data-table>

  <!-- Estado vacío sin cliente seleccionado -->
  <div class="ac-card ac-empty" *ngIf="!selectedCustomer()">
    <i class="fas fa-users"></i>
    <h3>Selecciona un cliente</h3>
    <p>Elige un cliente del listado para ver su estado de cuenta</p>
  </div>
</div>

<!-- Panel de estado -->
<p-overlayPanel #estadoPanel appendTo="body" styleClass="dc-menu-panel">
  <div class="dc-menu dc-menu--status" *ngIf="currentStatementBudget as b">
    <div class="dc-menu__title">Cambiar estado</div>
    <button *ngFor="let opt of estadoOptions" type="button" class="dc-status-opt"
      [class.dc-status-opt--active]="displayEstadoFor(b) === opt"
      (click)="selectEstadoStatement(opt); estadoPanel.hide()">
      <span class="dc-status-opt__label">{{ opt }}</span>
      <span class="dc-status-opt__check" *ngIf="displayEstadoFor(b) === opt">✓</span>
    </button>
  </div>
</p-overlayPanel>

<ngx-spinner bdColor="rgba(0, 0, 0, 0.8)" size="medium" color="#fff" type="square-jelly-box" [fullScreen]="true">
  <p style="color: white">Generando PDF...</p>
</ngx-spinner>
```

> `estadoOptions` (`BUDGET_ESTADOS`) es un array de strings; por eso el `*ngFor` usa `opt` directamente y `onEstadoChange` recibe el string. Esto coincide con el `<select>` original.

- [ ] **Step 3: Reemplazar el SCSS por estilos mínimos**

Reemplazar TODO el contenido de `account-statement.component.scss` por:

```scss
$primary: #6d28d9;
$primary-dark: #5b21b6;
$border: #e2e0ec;
$muted: #7c7691;

:host { display: block; }

.account-statement-container {
  font-family: 'Nunito Sans', system-ui, sans-serif;
  display: flex; flex-direction: column; gap: 14px;
  padding: 20px 24px 40px; color: #1f1b2e;
}

.ac-card {
  background: #fff; border: 1px solid #e8e6f0; border-radius: 14px;
  box-shadow: 0 1px 3px rgba(24, 20, 45, .05); overflow: hidden;

  &__head {
    display: flex; align-items: center; gap: 8px;
    padding: 11px 16px; border-bottom: 1px solid #efedf5;
    font-family: 'Nunito', system-ui, sans-serif; font-weight: 800; font-size: 13px; color: $primary-dark;
    i { color: $primary; }
  }
  &__body { padding: 14px 16px; }
}

.ac-field {
  display: flex; flex-direction: column; gap: 5px; max-width: 420px;
  label { display: flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; color: $muted;
    i { font-size: 10px; color: #a09ab5; } }
}
.ac-select {
  height: 38px; padding: 0 12px; border-radius: 8px; border: 1px solid $border;
  background: #fafafc; font-size: 13px; color: #1f1b2e; outline: none;
  &:focus { border-color: #a78bfa; background: #fff; }
}

.btn-pdf {
  display: inline-flex; align-items: center; gap: 8px; height: 38px; padding: 0 16px;
  border-radius: 10px; background: #c0392b; color: #fff; border: none; cursor: pointer;
  font-weight: 800; font-size: 13px; transition: background .15s ease;
  &:hover { background: #a93226; }
}

.code-value { font-family: 'Nunito', system-ui, sans-serif; font-weight: 800; color: $primary; font-variant-numeric: tabular-nums; }
.date-value { font-size: 12.5px; font-weight: 700; color: #55506d; }
.obra-name { font-weight: 700; color: #1f1b2e; }
.total-value { font-weight: 800; color: #15703f; font-variant-numeric: tabular-nums; }

.ac-input-sm {
  height: 32px; width: 100%; max-width: 130px; padding: 0 10px;
  border-radius: 7px; border: 1px solid $border; background: #fafafc; font-size: 13px; outline: none;
  &:focus { border-color: #a78bfa; background: #fff; }
}

.status-trigger { background: none; border: none; padding: 0; cursor: pointer; }

.action-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: 8px; border: 1px solid #e6e3f0;
  background: #fff; color: #6f6987; cursor: pointer; transition: all .15s ease;
  i { font-size: 0.85rem; }
  &.action-save:hover:not(:disabled) { background: #eafaf0; border-color: #c4ecd4; color: #15703f; }
  &:disabled { opacity: .45; cursor: default; }
}

.empty-content {
  display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 40px 20px; text-align: center;
  .empty-icon { font-size: 2.5rem; color: #d5d2e0; }
  h3 { margin: 0; font-family: 'Nunito', system-ui, sans-serif; font-weight: 800; color: #4b4560; }
  p  { margin: 0; font-size: 13px; color: $muted; }
}

.ac-empty {
  display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 48px 20px; text-align: center;
  i { font-size: 2.6rem; color: #d5d2e0; }
  h3 { margin: 0; font-family: 'Nunito', system-ui, sans-serif; font-weight: 800; color: #4b4560; }
  p  { margin: 0; font-size: 13px; color: $muted; }
}

// Panel de estado (overlay)
.dc-menu { min-width: 180px; padding: 6px; }
.dc-menu__title { font-size: 11px; font-weight: 800; color: $muted; text-transform: uppercase; padding: 6px 8px; }
.dc-status-opt {
  display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%;
  padding: 8px 10px; border: none; background: none; border-radius: 8px; cursor: pointer;
  font-size: 13px; font-weight: 700; color: #3d3757; text-align: left;
  &:hover { background: #f4f2fc; }
  &--active { color: $primary-dark; }
  &__check { color: $primary; font-weight: 800; }
}

@media (max-width: 768px) { .account-statement-container { padding: 14px 12px 30px; } }
```

- [ ] **Step 4: Wiring del módulo `ReportsModule`**

En `reports.module.ts`, añadir imports:

```ts
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { TooltipModule } from 'primeng/tooltip';
import { CustomSharedModule } from 'src/app/shared/shared.module';
import { DataTableComponent } from 'src/app/shared/ui/data-table/data-table.component';
import { DataTableColumnDirective } from 'src/app/shared/ui/data-table/data-table-column.directive';
import { StatusPillComponent } from 'src/app/shared/ui/status-pill/status-pill.component';
```

Y al array `imports` del `@NgModule` (después de `NgxSpinnerModule`):

```ts
    OverlayPanelModule,
    TooltipModule,
    CustomSharedModule,
    DataTableComponent,
    DataTableColumnDirective,
    StatusPillComponent,
```

> `CustomSharedModule` aporta pipes y el spinner ya está. `FormsModule` (ya importado) cubre el `<select>`.

- [ ] **Step 5: Build**

Run: `npx ng build --configuration development`
Expected: verde. Verificar `/#/reports/account-statement`:
  - Sin cliente → card "Selecciona un cliente".
  - Con cliente → KPI "Total adeudado", tabla con factura editable, estado (pill + panel de opciones que llama `onEstadoChange`), botón Guardar habilitándose solo al haber cambios (`hasChanges`), y "Generar PDF" funcional.

- [ ] **Step 6: Commit**

```bash
git add src/app/modules/reports
git commit -m "feat(account-statement): conversión completa a <app-data-table>"
```

---

## Self-Review

**1. Spec coverage:**
- Cambio compartido `headerIcon` → Task 1. ✓
- customers (avatar, KPI, icono) → Task 2. ✓
- products (lazy, KPI, icono) → Task 3. ✓
- project-reports (avatar, KPI, 4 acciones, email) → Task 4. ✓
- apus (2 KPIs, sin acciones) → Task 5. ✓
- account-statement (conversión completa: selector, factura inline, estado pill, guardar, total KPI, PDF) → Task 6. ✓
- Wiring de módulos por página → incluido en cada tarea. ✓
- UTF-8 → cada Step de HTML reescribe el archivo completo con caracteres correctos. ✓

**2. Placeholder scan:** sin "TBD"/"TODO"; todo el HTML/SCSS/TS es contenido real y completo.

**3. Type consistency:**
- `DataTableColumn`/`KpiDef` importados de `data-table.types` en todas las tareas. ✓
- `KpiDef` requiere `{ key, label, value, dotColor }` — todos los KPIs los proveen. ✓
- `DataTableColumn` usa `field`, `header`, `sortable?`, `align?`, `width?` — coincide con la definición. ✓
- Output `lazyLoad` emite `DataTableLazyEvent` con `first`/`rows` → `onPageChange(event)` de products los consume. ✓
- `estadoOptions` es `string[]` → `*ngFor let opt` + `onEstadoChange(id, opt)` (string). ✓
- `headerIcon` definido en Task 1 y consumido en Tasks 2-6. ✓

## Notas de riesgo

- **products búsqueda instantánea:** `searchChange` dispara `onSearch()` por tecleo (aprobado). Si se observa exceso de requests, se puede añadir un `debounceTime` en el componente compartido en una iteración posterior (fuera de alcance).
- **account-statement estado:** el original usaba `<select>`; ahora es pill + `p-overlayPanel`. La lógica (`onEstadoChange`/`saveBudget`/`hasChanges`) es idéntica; solo cambia el disparador de UI.
