# Budgets Table Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **No unit tests:** this project does not use unit tests. Do **not** create `.spec.ts` files. Each task is verified by a compile/build check; behavior is verified end-to-end in the running app in Task 10.

**Goal:** Ship the purple "Rediseño tabla de presupuestos" as a reusable `<app-data-table>` wrapper (over PrimeNG `p-table`) plus shared presentational components, and adopt it in the budgets list view.

**Architecture:** A hybrid wrapper `DataTableComponent` owns the shell (purple header, KPI bar, chips toolbar, themed `p-table`, footer) and exposes cell rendering via projected `ng-template`s registered by a `[dtColumn]` directive. Small standalone presentational components (`app-kpi-card`, `app-filter-chips`, `app-status-pill`, `app-client-avatar`) compose inside it. The wrapper exposes a `(lazyLoad)` seam so future backend pagination is wired once. Budgets is the first consumer and keeps all existing behavior.

**Tech Stack:** Angular 18.2 (standalone components + signals + `@if/@for`), PrimeNG 17.18 (`p-table`, Lara light-blue theme), SCSS. No test runner involved.

## Global Constraints

- Angular **18.2** — use only APIs available in 18.2: standalone components, `signal`/`computed`, `input()`/`input.required()`/`output()`, `@if`/`@for` control flow, `inject()`. **Do NOT** use Signal Forms or zoneless-only APIs.
- App runs on **zone.js** (not zoneless). Leaf presentational components use `ChangeDetectionStrategy.OnPush`. `DataTableComponent` uses **default** change detection (it hosts projected PrimeNG/`ngModel` cells).
- New shared components are **standalone** and live under `src/app/shared/ui/`.
- **No unit tests.** No `.spec.ts` files. Per-task verification = `npx ng build --configuration development` succeeds. Final verification = manual QA in the running app (Task 10).
- Palette (verbatim): primary `#6d28d9`, primary-dark `#5b21b6`, page bg `#f4f4f7`, text `#1f1b2e`, border `#e8e6f0`. Fonts: **Nunito** (headings/numbers) + **Nunito Sans** (body).
- Status colors (verbatim): Cotizada `#fff8e6/#8a5a00/#f6e2b0` dot `#f0a500`; Aprobada `#eafaf0/#15703f/#c4ecd4` dot `#1aa35c`; Facturada `#e9f6fd/#0d5c80/#c3e6f5` dot `#12a0d8`.
- Avatar palette (verbatim), color index = `name.length % 3`: `[{bg:#ede9fe,fg:#6d28d9},{bg:#e7f5ee,fg:#15703f},{bg:#fdf0e3,fg:#9a5a00}]`.
- Out of scope: density toggle, multi-select / bulk actions, Export button, real server-side pagination (only the `(lazyLoad)` seam).
- All existing budgets behavior (AI recording, inline factura edit, status dropdown save, per-row actions, all dialogs, spinner, toast, `p-menu`) must remain byte-for-byte in the `.ts` and keep working.

> **Build-check note:** `npx ng build --configuration development` compiles the whole app and validates every standalone component's template. Running it after each task is the guardrail that replaces unit tests. To save time you may batch: implement Tasks 1-6, run one build, then continue — but always build before the commit that closes a task.

---

### Task 1: Shared UI foundation + `ClientAvatarComponent`

**Files:**
- Create: `src/app/shared/ui/_dc-tokens.scss`
- Create: `src/app/shared/ui/client-avatar/client-avatar.component.ts`
- Create: `src/app/shared/ui/client-avatar/client-avatar.component.scss`
- Modify: `src/index.html` (add Nunito fonts in `<head>`)

**Interfaces:**
- Produces: `ClientAvatarComponent` (selector `app-client-avatar`, input `name: string`, computed `initials()`, `colorIndex()`, `bg()`, `fg()`). SCSS partial `_dc-tokens.scss` exporting `$dc-primary`, `$dc-primary-dark`, `$dc-bg`, `$dc-text`, `$dc-muted`, `$dc-border`, `$dc-font-head`, `$dc-font-body`.

- [ ] **Step 1: Add Nunito fonts to `src/index.html`**

Inside `<head>`, add after the existing Yanone `<link>`:

```html
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Nunito+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Create `src/app/shared/ui/_dc-tokens.scss`**

```scss
// Purple design-system tokens for the reusable data-table UI.
// Import with:  @use '../_dc-tokens' as dc;
$dc-primary:      #6d28d9;
$dc-primary-dark: #5b21b6;
$dc-bg:           #f4f4f7;
$dc-text:         #1f1b2e;
$dc-muted:        #7c7691;
$dc-border:       #e8e6f0;
$dc-font-head: 'Nunito', system-ui, sans-serif;
$dc-font-body: 'Nunito Sans', system-ui, sans-serif;
```

- [ ] **Step 3: Create `client-avatar.component.ts`**

```ts
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const AVATAR_PALETTE = [
  { bg: '#ede9fe', fg: '#6d28d9' },
  { bg: '#e7f5ee', fg: '#15703f' },
  { bg: '#fdf0e3', fg: '#9a5a00' },
];

@Component({
  selector: 'app-client-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="dc-avatar" [style.background]="bg()" [style.color]="fg()">{{ initials() }}</span>`,
  styleUrls: ['./client-avatar.component.scss'],
})
export class ClientAvatarComponent {
  name = input<string>('');

  initials = computed(() => {
    const name = (this.name() ?? '').trim();
    if (!name) return '';
    const words = name.split(/\s+/);
    const long = words.filter(w => w.length > 3);
    const src = long.length ? long : words;
    const acronym = src.slice(0, 2).map(w => (w[0] ?? '').toUpperCase()).join('');
    return acronym || name.slice(0, 2).toUpperCase();
  });

  colorIndex = computed(() => {
    const name = (this.name() ?? '').trim();
    return name ? name.length % AVATAR_PALETTE.length : 0;
  });

  bg = computed(() => AVATAR_PALETTE[this.colorIndex()].bg);
  fg = computed(() => AVATAR_PALETTE[this.colorIndex()].fg);
}
```

- [ ] **Step 4: Create `client-avatar.component.scss`**

```scss
@use '../_dc-tokens' as dc;

.dc-avatar {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; flex: none; border-radius: 6px;
  font-family: dc.$dc-font-head; font-size: 10px; font-weight: 800; line-height: 1;
}
```

- [ ] **Step 5: Build check**

Run: `npx ng build --configuration development`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/index.html src/app/shared/ui/_dc-tokens.scss src/app/shared/ui/client-avatar
git commit -m "feat(ui): add ClientAvatar component + purple design tokens + Nunito fonts"
```

---

### Task 2: `StatusPillComponent`

**Files:**
- Create: `src/app/shared/ui/status-pill/status-pill.component.ts`
- Create: `src/app/shared/ui/status-pill/status-pill.component.scss`

**Interfaces:**
- Produces: `StatusPillComponent` (selector `app-status-pill`, input `status: string`, computed `colors(): { bg; fg; border; dot }`).

- [ ] **Step 1: Create `status-pill.component.ts`**

```ts
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

interface PillColors { bg: string; fg: string; border: string; dot: string; }

const STATUS_COLORS: Record<string, PillColors> = {
  'Cotizada':      { bg: '#fff8e6', fg: '#8a5a00', border: '#f6e2b0', dot: '#f0a500' },
  'Aprobada':      { bg: '#eafaf0', fg: '#15703f', border: '#c4ecd4', dot: '#1aa35c' },
  'Facturada':     { bg: '#e9f6fd', fg: '#0d5c80', border: '#c3e6f5', dot: '#12a0d8' },
  'Rechazada':     { bg: '#fdecec', fg: '#b3261e', border: '#f5c6c2', dot: '#e5484d' },
  'En Desarrollo': { bg: '#fff3e0', fg: '#9a5a00', border: '#ffe0b2', dot: '#ff9800' },
  'Finalizado':    { bg: '#e8f5ec', fg: '#1b5e20', border: '#c4e4cc', dot: '#2e7d32' },
  'Pagada':        { bg: '#f3e8ff', fg: '#6b21a8', border: '#e3d1f7', dot: '#9333ea' },
};
const NEUTRAL: PillColors = { bg: '#f2f1f7', fg: '#5b5670', border: '#e2e0ec', dot: '#9a94ad' };

@Component({
  selector: 'app-status-pill',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="dc-pill" [style.background]="colors().bg" [style.color]="colors().fg" [style.borderColor]="colors().border">
      <span class="dc-pill__dot" [style.background]="colors().dot"></span>
      <span>{{ status() }}</span>
    </span>
  `,
  styleUrls: ['./status-pill.component.scss'],
})
export class StatusPillComponent {
  status = input<string>('');
  colors = computed<PillColors>(() => STATUS_COLORS[this.status()] ?? NEUTRAL);
}
```

- [ ] **Step 2: Create `status-pill.component.scss`**

```scss
@use '../_dc-tokens' as dc;

.dc-pill {
  display: inline-flex; align-items: center; gap: 6px; height: 24px; padding: 0 9px;
  border-radius: 999px; border: 1px solid; font-family: dc.$dc-font-body;
  font-size: 11.5px; font-weight: 800; white-space: nowrap;
}
.dc-pill__dot { width: 6px; height: 6px; border-radius: 50%; }
```

- [ ] **Step 3: Build check**

Run: `npx ng build --configuration development`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/shared/ui/status-pill
git commit -m "feat(ui): add StatusPill component with status color map"
```

---

### Task 3: `KpiCardComponent`

**Files:**
- Create: `src/app/shared/ui/kpi-card/kpi-card.component.ts`
- Create: `src/app/shared/ui/kpi-card/kpi-card.component.scss`

**Interfaces:**
- Produces: `KpiCardComponent` (selector `app-kpi-card`; inputs `value: string | number`, `label: string`, `dotColor: string`, `share: string`, `active: boolean`; output `cardClick: void`).

- [ ] **Step 1: Create `kpi-card.component.ts`**

```ts
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="dc-kpi" [class.dc-kpi--active]="active()" (click)="cardClick.emit()">
      <span class="dc-kpi__dot" [style.background]="dotColor()"></span>
      <span class="dc-kpi__body">
        <span class="dc-kpi__value">{{ value() }}</span>
        <span class="dc-kpi__label">{{ label() }}</span>
      </span>
      @if (share()) { <span class="dc-kpi__share">{{ share() }}</span> }
    </button>
  `,
  styleUrls: ['./kpi-card.component.scss'],
})
export class KpiCardComponent {
  value = input<string | number>('');
  label = input<string>('');
  dotColor = input<string>('#6d28d9');
  share = input<string>('');
  active = input<boolean>(false);
  cardClick = output<void>();
}
```

- [ ] **Step 2: Create `kpi-card.component.scss`**

```scss
@use '../_dc-tokens' as dc;

.dc-kpi {
  flex: 1 1 180px; display: flex; align-items: center; gap: 12px; padding: 12px 14px;
  border-radius: 12px; background: #fff; border: 1.5px solid dc.$dc-border;
  box-shadow: 0 1px 2px rgba(24, 20, 45, .05); font-family: dc.$dc-font-body;
  text-align: left; cursor: pointer; transition: border-color .15s ease;
  &:hover { border-color: #c4b5fd; }
  &--active { border-color: #a78bfa; }
}
.dc-kpi__dot { width: 6px; height: 30px; border-radius: 3px; flex: none; }
.dc-kpi__body { display: flex; flex-direction: column; gap: 1px; }
.dc-kpi__value {
  font-family: dc.$dc-font-head; font-weight: 800; font-size: 21px; line-height: 1.1;
  letter-spacing: -.5px; font-variant-numeric: tabular-nums; color: dc.$dc-text;
}
.dc-kpi__label {
  font-size: 11.5px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: dc.$dc-muted;
}
.dc-kpi__share { margin-left: auto; font-size: 11px; font-weight: 700; color: #a09ab5; }
```

- [ ] **Step 3: Build check**

Run: `npx ng build --configuration development`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/shared/ui/kpi-card
git commit -m "feat(ui): add KpiCard component (clickable filter card)"
```

---

### Task 4: `FilterChipsComponent`

**Files:**
- Create: `src/app/shared/ui/filter-chips/filter-chips.component.ts`
- Create: `src/app/shared/ui/filter-chips/filter-chips.component.scss`

**Interfaces:**
- Produces: `FilterChipsComponent` (selector `app-filter-chips`; inputs `options: ChipOption[]`, `value: string`; output `valueChange: string`). `ChipOption = { label: string; value: string; count?: number }` — exported from this file.

- [ ] **Step 1: Create `filter-chips.component.ts`**

```ts
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface ChipOption { label: string; value: string; count?: number; }

@Component({
  selector: 'app-filter-chips',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dc-chips">
      @for (opt of options(); track opt.value) {
        <button type="button" class="dc-chip" [class.dc-chip--active]="opt.value === value()" (click)="valueChange.emit(opt.value)">
          {{ opt.label }}@if (opt.count !== undefined) { <span class="dc-chip__count"> · {{ opt.count }}</span> }
        </button>
      }
    </div>
  `,
  styleUrls: ['./filter-chips.component.scss'],
})
export class FilterChipsComponent {
  options = input<ChipOption[]>([]);
  value = input<string>('');
  valueChange = output<string>();
}
```

- [ ] **Step 2: Create `filter-chips.component.scss`**

```scss
@use '../_dc-tokens' as dc;

.dc-chips { display: inline-flex; gap: 4px; padding: 3px; background: #f4f3f8; border-radius: 9px; }
.dc-chip {
  height: 28px; padding: 0 12px; border: none; border-radius: 7px; cursor: pointer;
  font-family: dc.$dc-font-body; font-size: 12.5px; font-weight: 700; background: transparent; color: dc.$dc-muted;
  &--active { background: #fff; color: dc.$dc-primary-dark; box-shadow: 0 1px 2px rgba(24, 20, 45, .12); }
}
.dc-chip__count { opacity: .85; }
```

- [ ] **Step 3: Build check**

Run: `npx ng build --configuration development`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/shared/ui/filter-chips
git commit -m "feat(ui): add FilterChips segmented filter component"
```

---

### Task 5: Data-table types + `[dtColumn]` directive

**Files:**
- Create: `src/app/shared/ui/data-table/data-table.types.ts`
- Create: `src/app/shared/ui/data-table/data-table-column.directive.ts`

**Interfaces:**
- Produces:
  - `DataTableColumn = { field: string; header: string; sortable?: boolean; align?: 'left'|'right'|'center'; sortField?: string; width?: string }`
  - `KpiDef = { key: string; label: string; value: string | number; dotColor: string; share?: string }`
  - `DataTableLazyEvent = { first: number; rows: number; sortField?: string; sortOrder?: number; globalFilter?: string }`
  - `DataTableColumnDirective` (selector `[dtColumn]`, input `dtColumn: string` = column field, public `templateRef: TemplateRef<{ $implicit: unknown }>`).

- [ ] **Step 1: Create `data-table.types.ts`**

```ts
export interface DataTableColumn {
  field: string;
  header: string;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  sortField?: string;
  width?: string;
}

export interface KpiDef {
  key: string;
  label: string;
  value: string | number;
  dotColor: string;
  share?: string;
}

export interface DataTableLazyEvent {
  first: number;
  rows: number;
  sortField?: string;
  sortOrder?: number;
  globalFilter?: string;
}
```

- [ ] **Step 2: Create `data-table-column.directive.ts`**

```ts
import { Directive, TemplateRef, inject, input } from '@angular/core';

@Directive({
  selector: '[dtColumn]',
  standalone: true,
})
export class DataTableColumnDirective {
  /** The column `field` this template renders. */
  dtColumn = input.required<string>();
  readonly templateRef = inject<TemplateRef<{ $implicit: unknown }>>(TemplateRef);
}
```

- [ ] **Step 3: Build check**

Run: `npx ng build --configuration development`
Expected: build succeeds (the directive/types aren't imported anywhere yet, so this only checks they compile).

- [ ] **Step 4: Commit**

```bash
git add src/app/shared/ui/data-table/data-table.types.ts src/app/shared/ui/data-table/data-table-column.directive.ts
git commit -m "feat(ui): add data-table types and [dtColumn] template directive"
```

---

### Task 6: `DataTableComponent` (the reusable shell)

**Files:**
- Create: `src/app/shared/ui/data-table/data-table.component.ts`
- Create: `src/app/shared/ui/data-table/data-table.component.html`
- Create: `src/app/shared/ui/data-table/data-table.component.scss`

**Interfaces:**
- Consumes: `DataTableColumn`, `KpiDef`, `DataTableLazyEvent`, `DataTableColumnDirective` (Task 5), `KpiCardComponent` (Task 3), `FilterChipsComponent` + `ChipOption` (Task 4), PrimeNG `TableModule`, `InputTextModule`.
- Produces: `DataTableComponent` (selector `app-data-table`, default change detection). Inputs: `columns`, `value`, `loading`, `rowKey`, `title`, `subtitle`, `kpis`, `activeKpi`, `chips`, `activeChip`, `searchPlaceholder`, `globalFilterFields`, `rows`, `rowsPerPageOptions`, `sortField`, `sortOrder`, `currentPageReportTemplate`, `lazy`, `totalRecords`. Outputs: `kpiClick: string`, `chipChange: string`, `searchChange: string`, `lazyLoad: DataTableLazyEvent`. Content slots: `[dt-actions]`, `[dt-empty]`, per-column `*dtColumn`. Public template helpers: `templateFor(field)`, `resolve(row, field)`, `onSearch(dt, value)`, `onLazy(event)`.

- [ ] **Step 1: Create `data-table.component.ts`**

```ts
import {
  AfterContentInit, Component, ContentChildren, DestroyRef, QueryList,
  TemplateRef, inject, input, output,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TableModule, Table, TableLazyLoadEvent } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { DataTableColumnDirective } from './data-table-column.directive';
import { DataTableColumn, KpiDef, DataTableLazyEvent } from './data-table.types';
import { KpiCardComponent } from '../kpi-card/kpi-card.component';
import { FilterChipsComponent, ChipOption } from '../filter-chips/filter-chips.component';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [NgTemplateOutlet, TableModule, InputTextModule, KpiCardComponent, FilterChipsComponent],
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss'],
})
export class DataTableComponent implements AfterContentInit {
  columns = input<DataTableColumn[]>([]);
  value = input<any[]>([]);
  loading = input<boolean>(false);
  rowKey = input<string>('');
  title = input<string>('');
  subtitle = input<string>('');
  kpis = input<KpiDef[]>([]);
  activeKpi = input<string>('');
  chips = input<ChipOption[]>([]);
  activeChip = input<string>('');
  searchPlaceholder = input<string>('Buscar…');
  globalFilterFields = input<string[]>([]);
  rows = input<number>(20);
  rowsPerPageOptions = input<number[]>([20, 40, 60, 100]);
  sortField = input<string>('');
  sortOrder = input<number>(-1);
  currentPageReportTemplate = input<string>('{first} - {last} de {totalRecords}');
  lazy = input<boolean>(false);
  totalRecords = input<number>(0);

  kpiClick = output<string>();
  chipChange = output<string>();
  searchChange = output<string>();
  lazyLoad = output<DataTableLazyEvent>();

  @ContentChildren(DataTableColumnDirective) private columnDirectives!: QueryList<DataTableColumnDirective>;
  private templates = new Map<string, TemplateRef<{ $implicit: unknown }>>();
  private destroyRef = inject(DestroyRef);

  ngAfterContentInit(): void {
    this.rebuildTemplateMap();
    const sub = this.columnDirectives.changes.subscribe(() => this.rebuildTemplateMap());
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  private rebuildTemplateMap(): void {
    this.templates.clear();
    this.columnDirectives.forEach(d => this.templates.set(d.dtColumn(), d.templateRef));
  }

  templateFor(field: string): TemplateRef<{ $implicit: unknown }> | null {
    return this.templates.get(field) ?? null;
  }

  /** Resolve a possibly-nested field path like 'customerDto.customerName'. */
  resolve(row: any, field: string): unknown {
    return field.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), row);
  }

  onSearch(dt: Table, value: string): void {
    dt.filterGlobal(value, 'contains');
    this.searchChange.emit(value);
  }

  onLazy(event: TableLazyLoadEvent): void {
    if (!this.lazy()) return;
    this.lazyLoad.emit({
      first: event.first ?? 0,
      rows: event.rows ?? this.rows(),
      sortField: Array.isArray(event.sortField) ? event.sortField[0] : event.sortField ?? undefined,
      sortOrder: event.sortOrder ?? undefined,
      globalFilter: typeof event.globalFilter === 'string' ? event.globalFilter : undefined,
    });
  }
}
```

- [ ] **Step 2: Create `data-table.component.html`**

```html
<div class="dc-table">
  <div class="dc-header">
    <div class="dc-header__left">
      <div class="dc-header__icon">$</div>
      <div class="dc-header__text">
        <div class="dc-header__title">{{ title() }}</div>
        @if (subtitle()) { <div class="dc-header__subtitle">{{ subtitle() }}</div> }
      </div>
    </div>
    <div class="dc-header__actions"><ng-content select="[dt-actions]"></ng-content></div>
  </div>

  @if (kpis().length) {
    <div class="dc-kpis">
      @for (k of kpis(); track k.key) {
        <app-kpi-card
          [value]="k.value" [label]="k.label" [dotColor]="k.dotColor" [share]="k.share ?? ''"
          [active]="k.key === activeKpi()" (cardClick)="kpiClick.emit(k.key)"></app-kpi-card>
      }
    </div>
  }

  <div class="dc-card">
    <p-table #dt
      [value]="value()" [loading]="loading()" [paginator]="true" [rows]="rows()"
      [rowsPerPageOptions]="rowsPerPageOptions()" [globalFilterFields]="globalFilterFields()"
      [sortField]="sortField()" [sortOrder]="sortOrder()" [rowHover]="true"
      [dataKey]="rowKey()" [lazy]="lazy()" [totalRecords]="totalRecords()"
      (onLazyLoad)="onLazy($event)" [currentPageReportTemplate]="currentPageReportTemplate()"
      styleClass="dc-datatable" [tableStyle]="{ 'min-width': '60rem' }">

      <ng-template pTemplate="caption">
        <div class="dc-toolbar">
          <div class="dc-search">
            <span class="dc-search__icon">⌕</span>
            <input pInputText type="text" [placeholder]="searchPlaceholder()"
              (input)="onSearch(dt, $any($event.target).value)" />
          </div>
          @if (chips().length) {
            <app-filter-chips [options]="chips()" [value]="activeChip()"
              (valueChange)="chipChange.emit($event)"></app-filter-chips>
          }
          <span class="dc-toolbar__count">{{ value().length }} visibles</span>
        </div>
      </ng-template>

      <ng-template pTemplate="header">
        <tr>
          @for (col of columns(); track col.field) {
            @if (col.sortable) {
              <th [pSortableColumn]="col.sortField || col.field" [class]="'dc-th align-' + (col.align || 'left')">
                <span>{{ col.header }}</span>
                <p-sortIcon [field]="col.sortField || col.field"></p-sortIcon>
              </th>
            } @else {
              <th [class]="'dc-th align-' + (col.align || 'left')">{{ col.header }}</th>
            }
          }
        </tr>
      </ng-template>

      <ng-template pTemplate="body" let-row>
        <tr>
          @for (col of columns(); track col.field) {
            <td [class]="'dc-td align-' + (col.align || 'left')">
              @if (templateFor(col.field); as tpl) {
                <ng-container [ngTemplateOutlet]="tpl" [ngTemplateOutletContext]="{ $implicit: row }"></ng-container>
              } @else {
                {{ resolve(row, col.field) }}
              }
            </td>
          }
        </tr>
      </ng-template>

      <ng-template pTemplate="emptymessage">
        <tr><td [attr.colspan]="columns().length" class="dc-empty">
          <ng-content select="[dt-empty]"></ng-content>
        </td></tr>
      </ng-template>
    </p-table>
  </div>
</div>
```

- [ ] **Step 3: Create `data-table.component.scss`**

```scss
@use '../_dc-tokens' as dc;

:host { display: block; font-family: dc.$dc-font-body; color: dc.$dc-text; }

.dc-table { display: flex; flex-direction: column; gap: 14px; }

.dc-header {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  background: dc.$dc-primary; border-radius: 14px; padding: 14px 18px;
  &__left { display: flex; align-items: center; gap: 12px; }
  &__icon {
    width: 34px; height: 34px; border-radius: 9px; background: rgba(255,255,255,.16);
    display: flex; align-items: center; justify-content: center;
    font-family: dc.$dc-font-head; font-weight: 800; font-size: 15px; color: #fff;
  }
  &__title { font-family: dc.$dc-font-head; font-weight: 800; font-size: 19px; color: #fff; letter-spacing: -.2px; }
  &__subtitle { font-size: 12px; color: rgba(255,255,255,.72); font-weight: 600; }
  &__actions { display: flex; align-items: center; gap: 8px; }
}

.dc-kpis { display: flex; gap: 10px; flex-wrap: wrap; }

.dc-card {
  background: #fff; border: 1px solid dc.$dc-border; border-radius: 14px;
  box-shadow: 0 1px 3px rgba(24,20,45,.05); overflow: hidden;
}

.dc-toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.dc-search {
  position: relative; flex: 0 1 320px; display: flex; align-items: center;
  &__icon { position: absolute; left: 11px; font-size: 13px; color: #a09ab5; }
  input {
    width: 100%; height: 34px; padding: 0 12px 0 28px; border-radius: 8px;
    border: 1px solid #e2e0ec; background: #fafafc; font-family: dc.$dc-font-body;
    font-size: 13px; color: dc.$dc-text; outline: none;
    &:focus { border-color: #a78bfa; background: #fff; }
  }
}
.dc-toolbar__count { margin-left: auto; font-size: 12px; font-weight: 600; color: #8b85a1; }

// ---- p-table theming, scoped under :host so it never leaks to the Lara-blue app ----
:host ::ng-deep .dc-datatable {
  .p-datatable-thead > tr > th {
    background: #fafafc; border-bottom: 1px solid #ebe9f3; color: #8b85a1;
    font-family: dc.$dc-font-body; font-size: 10.5px; font-weight: 800;
    letter-spacing: .09em; text-transform: uppercase; padding: 9px 14px;
  }
  .p-datatable-tbody > tr { transition: background .12s ease; }
  .p-datatable-tbody > tr:hover { background: #faf9ff; }
  .p-datatable-tbody > tr > td { border-bottom: 1px solid #f2f1f7; padding: 8px 14px; font-size: 13px; }
  .p-sortable-column.p-highlight,
  .p-sortable-column.p-highlight .p-sortable-column-icon { color: dc.$dc-primary-dark; }
  .p-paginator {
    background: #fafafc; border-top: 1px solid #efedf5;
    .p-highlight { background: dc.$dc-primary; color: #fff; }
  }
  .align-right { text-align: right; }
  .align-center { text-align: center; }
}
```

- [ ] **Step 4: Build check**

Run: `npx ng build --configuration development`
Expected: build succeeds (component compiles; not yet used by any view).

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/ui/data-table
git commit -m "feat(ui): add reusable DataTable wrapper over p-table (lazy-ready)"
```

---

### Task 7: Budgets filter logic + column config (TS)

**Files:**
- Modify: `src/app/modules/budgets/list-budget/list-budget.component.ts`

**Interfaces:**
- Consumes: `BudgetModel`, `DataTableColumn` + `KpiDef` (Task 5), `ChipOption` (Task 4).
- Produces on `ListBudgetComponent`: `activeStatusFilter: string` (default `'Todas'`); `tableColumns: DataTableColumn[]`; getters `filteredBudgets`, `kpiCards: KpiDef[]`, `chipOptions: ChipOption[]`; methods `onKpiClick(key: string)`, `onChipChange(value: string)`. (Behavior verified in Task 10.)

- [ ] **Step 1: Add imports at the top of `list-budget.component.ts`**

```ts
import { DataTableColumn, KpiDef } from 'src/app/shared/ui/data-table/data-table.types';
import { ChipOption } from 'src/app/shared/ui/filter-chips/filter-chips.component';
```

- [ ] **Step 2: Add fields, getters and handlers inside the `ListBudgetComponent` class**

Add near the other public fields (e.g. just after `searchValue`):

```ts
activeStatusFilter: string = 'Todas';

tableColumns: DataTableColumn[] = [
  { field: 'internalCode', header: 'Codigo', sortable: true, sortField: 'budgetId' },
  { field: 'date', header: 'Fecha', sortable: true },
  { field: 'budgetName', header: 'Obra', sortable: true },
  { field: 'customerDto.customerName', header: 'Cliente', sortable: true },
  { field: 'externalInvoice', header: 'Factura', sortable: true },
  { field: 'estado', header: 'Estado', sortable: true },
  { field: 'total', header: 'Total', sortable: true, align: 'right' },
  { field: 'acciones', header: 'Acciones', align: 'right' },
];

/** 'Todas' = all; 'Facturadas' = has external invoice; else exact estado. */
private matchesStatus(b: BudgetModel, status: string): boolean {
  if (status === 'Todas') return true;
  if (status === 'Facturadas') return !!b.externalInvoice && b.externalInvoice !== '0' && b.externalInvoice !== '';
  return b.estado === status;
}

get filteredBudgets(): BudgetModel[] {
  return this.budgets.filter(b => this.matchesStatus(b, this.activeStatusFilter));
}

get kpiCards(): KpiDef[] {
  return [
    { key: 'Todas',      label: 'Total Cotizaciones', value: this.budgets.length,               dotColor: '#6d28d9' },
    { key: 'Aprobada',   label: 'Aprobadas',          value: this.getCountByStatus('Aprobada'), dotColor: '#1aa35c' },
    { key: 'Cotizada',   label: 'Cotizadas',          value: this.getCountByStatus('Cotizada'), dotColor: '#f0a500' },
    { key: 'Facturadas', label: 'Facturadas',         value: this.getCountWithInvoice(),        dotColor: '#12a0d8' },
  ];
}

get chipOptions(): ChipOption[] {
  return [
    { label: 'Todas',     value: 'Todas',     count: this.budgets.length },
    { label: 'Cotizada',  value: 'Cotizada',  count: this.getCountByStatus('Cotizada') },
    { label: 'Aprobada',  value: 'Aprobada',  count: this.getCountByStatus('Aprobada') },
    { label: 'Facturada', value: 'Facturada', count: this.getCountByStatus('Facturada') },
  ];
}

onKpiClick(key: string): void { this.activeStatusFilter = key; }
onChipChange(value: string): void { this.activeStatusFilter = value; }
```

- [ ] **Step 3: Build check**

Run: `npx ng build --configuration development`
Expected: build succeeds (the template still uses the old `<p-table>` — that's fine; these members are additive and unused until Task 9).

- [ ] **Step 4: Commit**

```bash
git add src/app/modules/budgets/list-budget/list-budget.component.ts
git commit -m "feat(budgets): add status-filter logic + column config for data-table"
```

---

### Task 8: Register shared components in `BudgetsModule`

**Files:**
- Modify: `src/app/modules/budgets/budgets.module.ts`

**Interfaces:**
- Consumes: `DataTableComponent`, `DataTableColumnDirective`, `KpiCardComponent`, `FilterChipsComponent`, `StatusPillComponent`, `ClientAvatarComponent`.
- Produces: these standalone components/directive available to `ListBudgetComponent`'s template.

- [ ] **Step 1: Add import statements to `budgets.module.ts`**

```ts
import { DataTableComponent } from 'src/app/shared/ui/data-table/data-table.component';
import { DataTableColumnDirective } from 'src/app/shared/ui/data-table/data-table-column.directive';
import { KpiCardComponent } from 'src/app/shared/ui/kpi-card/kpi-card.component';
import { FilterChipsComponent } from 'src/app/shared/ui/filter-chips/filter-chips.component';
import { StatusPillComponent } from 'src/app/shared/ui/status-pill/status-pill.component';
import { ClientAvatarComponent } from 'src/app/shared/ui/client-avatar/client-avatar.component';
```

- [ ] **Step 2: Add them to the `@NgModule` `imports: [ ... ]` array** (standalone → `imports`, never `declarations`)

```ts
    DataTableComponent,
    DataTableColumnDirective,
    KpiCardComponent,
    FilterChipsComponent,
    StatusPillComponent,
    ClientAvatarComponent,
```

- [ ] **Step 3: Build check**

Run: `npx ng build --configuration development`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/modules/budgets/budgets.module.ts
git commit -m "chore(budgets): register shared data-table UI components in module"
```

---

### Task 9: Rewrite `list-budget.component.html` with `<app-data-table>`

**Files:**
- Modify: `src/app/modules/budgets/list-budget/list-budget.component.html`

**Interfaces:**
- Consumes: the shared components (Tasks 1-6) and all existing `ListBudgetComponent` members + Task 7's additions (`tableColumns`, `filteredBudgets`, `kpiCards`, `chipOptions`, `activeStatusFilter`, `onKpiClick`, `onChipChange`).
- Produces: the redesigned budgets list view. No `.ts` behavior change beyond Task 7.

> **Preserve verbatim** (only their placement changes): AI recording button block, inline factura edit block, status `p-dropdown` block, the 5 action buttons, `<p-menu #menu>`, `<app-confirmation-modal>`, both `<p-dialog>`s (schedule + merge), `<app-email-selector-modal>`, `<p-toast key="budget-inline">`, `<ngx-spinner>`. Do not delete or rename any handler binding.

- [ ] **Step 1: Replace the top block of the file** — from line 1 (`<!-- Container Principal Moderno -->`) through the `</div>` that closes `.budget-list-card` (the block that contains `<p-table>` and `<p-menu>`) — with:

```html
<!-- Redesigned budgets list -->
<div class="budget-list-container">
  <app-data-table
    class="dc-table-root"
    [columns]="tableColumns"
    [value]="filteredBudgets"
    [loading]="loading"
    rowKey="budgetId"
    title="Cotizaciones"
    [subtitle]="budgets.length + ' registros'"
    [kpis]="kpiCards"
    [activeKpi]="activeStatusFilter"
    [chips]="chipOptions"
    [activeChip]="activeStatusFilter"
    searchPlaceholder="Buscar por codigo, cliente, obra..."
    [globalFilterFields]="['internalCode','date','budgetName','customerDto.customerName','total','estado','externalInvoice']"
    [rows]="20"
    [rowsPerPageOptions]="[20,40,60,100]"
    sortField="date"
    [sortOrder]="-1"
    currentPageReportTemplate="{first} al {last} de {totalRecords} cotizaciones"
    (kpiClick)="onKpiClick($event)"
    (chipChange)="onChipChange($event)">

    <!-- Header actions -->
    <button dt-actions
      pButton type="button" class="btn-ai-recording"
      [ngClass]="{'recording': isRecording, 'processing': isProcessingAI && !isRecording, 'idle': !isRecording && !isProcessingAI}"
      (click)="toggleRecordingAI()" [disabled]="isProcessingAI && !isRecording"
      [pTooltip]="isRecording ? 'Toca para detener' : (isProcessingAI ? aiProcessingStatus : 'Crear cotizacion con IA')"
      tooltipPosition="bottom">
      <div class="btn-ai-content">
        <div class="mic-container" [class.pulse-animation]="isRecording || isProcessingAI">
          <i class="pi" [ngClass]="{'pi-microphone': !isProcessingAI || isRecording, 'pi-spin pi-spinner': isProcessingAI && !isRecording}"></i>
        </div>
        <span class="btn-ai-text">{{ isRecording ? 'Grabando...' : (isProcessingAI ? aiProcessingStatus : 'Crear con IA') }}</span>
      </div>
      <div *ngIf="isRecording" class="recording-waves">
        <span class="wave"></span><span class="wave"></span><span class="wave"></span><span class="wave"></span>
      </div>
    </button>
    <a dt-actions [routerLink]="'/budgets/add'" class="btn-new-budget">
      <i class="fas fa-plus"></i><span>Nueva Cotizacion</span>
    </a>

    <!-- Obra -->
    <ng-template dtColumn="budgetName" let-budget>
      <div class="name-wrapper">
        <span class="budget-name">{{ budget.budgetName | capitalize | truncate:50 }}</span>
        <span *ngIf="budget.isInvoice" class="invoice-indicator" pTooltip="Facturada" tooltipPosition="top">
          <i class="fas fa-receipt"></i>
        </span>
      </div>
    </ng-template>

    <!-- Cliente -->
    <ng-template dtColumn="customerDto.customerName" let-budget>
      <div class="customer-cell">
        <app-client-avatar [name]="budget.customerDto.customerName"></app-client-avatar>
        <span class="customer-name">{{ budget.customerDto.customerName | capitalize | truncate:30 }}</span>
      </div>
    </ng-template>

    <!-- Factura (inline edit — preserved) -->
    <ng-template dtColumn="externalInvoice" let-budget>
      <span *ngIf="editingInvoiceBudgetId !== budget.budgetId" (click)="startEditingInvoice(budget)"
        class="invoice-value" [class.has-invoice]="budget.externalInvoice && budget.externalInvoice !== '0'"
        pTooltip="Clic para editar" tooltipPosition="top">
        <c-badge *ngIf="budget.externalInvoice && budget.externalInvoice !== '0'" color="success">{{ budget.externalInvoice }}</c-badge>
        <span *ngIf="!budget.externalInvoice || budget.externalInvoice === '0'" class="no-invoice"><i class="far fa-file"></i> Sin factura</span>
      </span>
      <div *ngIf="editingInvoiceBudgetId === budget.budgetId" class="invoice-edit-wrapper">
        <input pInputText [(ngModel)]="editingInvoiceValue" (blur)="saveExternalInvoice(budget)"
          (keyup.enter)="saveExternalInvoice(budget)" (keyup.escape)="cancelEditingInvoice()"
          class="invoice-input" placeholder="Factura" #invoiceInput>
      </div>
      <i *ngIf="savingInvoiceId === budget.budgetId" class="pi pi-spin pi-spinner inline-saving-spinner"></i>
      <i *ngIf="savedInvoiceId === budget.budgetId" class="fas fa-check saved-check"></i>
    </ng-template>

    <!-- Estado (dropdown + status pill — preserved) -->
    <ng-template dtColumn="estado" let-budget>
      <div class="status-cell-wrapper">
        <p-dropdown [options]="statusOptions" [(ngModel)]="budget.estado" (onChange)="onStatusChange(budget)"
          appendTo="body" styleClass="status-dropdown" optionLabel="label" optionValue="value">
          <ng-template pTemplate="selectedItem">
            <app-status-pill *ngIf="budget.estado" [status]="budget.estado"></app-status-pill>
          </ng-template>
          <ng-template let-option pTemplate="item"><app-status-pill [status]="option.value"></app-status-pill></ng-template>
        </p-dropdown>
        <i *ngIf="savingStatusId === budget.budgetId" class="pi pi-spin pi-spinner inline-saving-spinner"></i>
        <i *ngIf="savedStatusId === budget.budgetId" class="fas fa-check saved-check"></i>
      </div>
    </ng-template>

    <!-- Total -->
    <ng-template dtColumn="total" let-budget>
      <span class="total-value">$ {{ budget.total.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }}</span>
    </ng-template>

    <!-- Acciones (preserved) -->
    <ng-template dtColumn="acciones" let-budget>
      <div class="action-buttons">
        <button class="action-btn action-edit" [routerLink]="['/budgets/update', budget.budgetId]" pTooltip="Editar" tooltipPosition="top"><i class="fas fa-pen"></i></button>
        <button class="action-btn action-pdf" (click)="downloadBudget(budget)" pTooltip="Descargar PDF" tooltipPosition="top"><i class="fas fa-file-pdf"></i></button>
        <button class="action-btn action-excel" (click)="downloadExcel(budget)" pTooltip="Descargar Excel" tooltipPosition="top"><i class="fas fa-file-excel"></i></button>
        <button class="action-btn action-copy" (click)="copybudget(budget)" pTooltip="Duplicar" tooltipPosition="top"><i class="fas fa-copy"></i></button>
        <button class="action-btn action-more" (click)="onMenuClick($event, budget)" pTooltip="Mas opciones" tooltipPosition="top"><i class="fas fa-ellipsis-v"></i></button>
      </div>
    </ng-template>

    <!-- Empty state -->
    <div dt-empty class="empty-content">
      <i class="fas fa-folder-open empty-icon"></i>
      <h3>No hay cotizaciones</h3>
      <p>No se encontraron cotizaciones que coincidan con tu busqueda</p>
      <a [routerLink]="'/budgets/add'" class="btn-create-first"><i class="fas fa-plus"></i> Crear primera cotizacion</a>
    </div>
  </app-data-table>

  <!-- Context menu (preserved) -->
  <p-menu #menu [model]="menuItems" [popup]="true" appendTo="body"></p-menu>
</div>
```

- [ ] **Step 2: Leave everything below the old `.budget-list-card` closing `</div>` unchanged** — `<app-confirmation-modal>`, both `<p-dialog>`s, `<app-email-selector-modal>`, `<p-toast>`, `<ngx-spinner>` stay exactly as-is.

- [ ] **Step 3: Build check**

Run: `npx ng build --configuration development`
Expected: build succeeds. Fix any template binding error (typo'd handler, missing import) before committing.

> The `internalCode` and `date` columns have no `*dtColumn` template, so the wrapper renders them with the default cell (raw value). Optional polish: add `*dtColumn="'internalCode'"` (code badge) and `*dtColumn="'date'"` (`{{ budget.date | date:'dd MMM yyyy' }}`) templates mirroring the old markup — not required for the task.

- [ ] **Step 4: Commit**

```bash
git add src/app/modules/budgets/list-budget/list-budget.component.html
git commit -m "feat(budgets): render list with reusable <app-data-table> redesign"
```

---

### Task 10: Prune styles + end-to-end verification

**Files:**
- Modify: `src/app/modules/budgets/list-budget/list-budget.component.scss`

**Interfaces:**
- Consumes: everything from Tasks 1-9.
- Produces: a fully working, styled `/#/budgets/budgets` view.

- [ ] **Step 1: Add the `customer-cell` layout rule and prune dead styles in `list-budget.component.scss`**

Add:

```scss
.customer-cell { display: flex; align-items: center; gap: 8px; min-width: 0; }
.customer-cell .customer-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
```

Keep rules still referenced by the new template: `.btn-ai-recording` (+ recording/processing/idle/waves/mic-container/btn-ai-*), `.btn-new-budget`, `.name-wrapper`, `.budget-name`, `.invoice-indicator`, `.customer-name`, `.invoice-value`, `.has-invoice`, `.no-invoice`, `.invoice-edit-wrapper`, `.invoice-input`, `.inline-saving-spinner`, `.saved-check`, `.status-cell-wrapper`, `.status-dropdown`, `.total-value`, `.action-buttons`, `.action-btn` (+ variants), `.empty-content`, `.empty-icon`, `.btn-create-first`, and all dialog styles (`.dialog-*`, `.form-group-modern`, `.label-modern`, `.input-modern`, `.textarea-modern`, `.dropdown-*`, `.required-star`, `.modern-dialog`).

Remove rules for markup that no longer exists: `.budget-list-header`, `.header-*`, `.page-title`, `.page-subtitle`, `.stats-row`, `.stat-card` (+ variants), `.budget-list-card`, `.table-header-modern`, `.search-section`, `.search-input*`, `.clear-search-btn`, `.table-actions`, `.btn-filter-action`, `.table-header-row`, `.th-*`, `.td-*`, `.table-body-row`, `.code-badge`, `.date-text`, `.status-badge*`.

> If unsure whether a class is still used, grep the new `list-budget.component.html` for it before deleting. When in doubt, keep it — dead CSS is harmless; deleting a live rule breaks the view.

- [ ] **Step 2: Production build**

Run: `npx ng build`
Expected: build succeeds with no errors.

- [ ] **Step 3: Manual verification in the running app**

Run: `npx ng serve` and open `http://localhost:4200/#/budgets/budgets`. Confirm:
- Purple header renders with `$` icon, "Cotizaciones", and "N registros".
- 4 KPI cards render; clicking one filters the table (active card gets purple border) and stays in sync with the chips.
- Filter chips filter the table; counts are correct; "Facturada" chip filters by estado while the "Facturadas" KPI filters by present invoice.
- Client avatars show colored initials next to the client name.
- Status pills render with correct colors; changing status via the dropdown still saves (spinner → toast on desktop / check on mobile).
- Inline factura edit still works (click → input → blur/enter saves; escape cancels).
- Row actions (edit / PDF / Excel / duplicate / more-menu) all work; "Crear con IA" recording still works; "Nueva Cotizacion" navigates.
- Search filters across the configured fields; column sorting and pagination work.
- Other tables/pages in the app still look normal (the purple theme did not leak out of `app-data-table`).

- [ ] **Step 4: Commit**

```bash
git add src/app/modules/budgets/list-budget/list-budget.component.scss
git commit -m "style(budgets): prune dead list styles after data-table redesign"
```

---

## Self-Review

**Spec coverage (spec §→task):**
- §3 file layout → Tasks 1-6 create every listed file. ✔
- §4.1 DataTableComponent incl. `(lazyLoad)` seam → Task 6. ✔
- §4.2-4.5 KpiCard/FilterChips/StatusPill/ClientAvatar → Tasks 3/4/2/1. ✔
- §5 column config + custom cells → Task 5 (types/directive) + Task 9 (`*dtColumn`). ✔
- §6 budgets integration → Tasks 7, 9. ✔
- §7 theming (scoped `::ng-deep` under `:host`, Nunito fonts, `.dc-*`) → Tasks 1, 6. ✔
- §8 testing → **N/A: user directed no unit tests.** Replaced by per-task build checks + Task 10 manual QA. ✔
- §10 out-of-scope → nothing implemented; only lazy seam. ✔

**Placeholder scan:** No "TBD"/"handle edge cases"/"similar to Task N". Every code step has real code. Task 9/10 optional-polish notes are explicitly optional.

**Type consistency:** `DataTableColumn`/`KpiDef`/`DataTableLazyEvent` (Task 5) and `ChipOption` (Task 4) consumed with identical shapes in Tasks 6/7/9. `activeStatusFilter`/`tableColumns`/`filteredBudgets`/`kpiCards`/`chipOptions`/`onKpiClick`/`onChipChange` names identical across Tasks 7 and 9. `templateFor`/`resolve`/`onSearch`/`onLazy` defined and used only within Task 6. Selectors (`app-data-table`, `app-kpi-card`, `app-filter-chips`, `app-status-pill`, `app-client-avatar`, `[dtColumn]`) consistent between definition and usage. ✔
