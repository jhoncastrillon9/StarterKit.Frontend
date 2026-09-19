import { CommonModule } from '@angular/common';
import {
  Component, DestroyRef, ElementRef, HostListener, ViewEncapsulation,
  effect, inject, input, model, signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReferenceDataService, ReferenceItem } from '../../services/reference-data.service';

/**
 * Desplegable con buscador sobre un catálogo oficial (DIAN, DANE, ISO).
 *
 * Existe porque pedirle al usuario el código DANE de su municipio o el código de
 * una responsabilidad fiscal en una casilla de texto libre garantiza datos mal
 * escritos y, más adelante, facturas rechazadas. Aquí el usuario busca por nombre
 * y el componente guarda el código.
 *
 * Emite el CÓDIGO, no el nombre: el nombre es lo que se lee, el código es lo que
 * viaja en el XML de la factura.
 */
@Component({
  selector: 'app-reference-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="ref-select" [class.ref-select--open]="open()">
      <div class="ref-select__field"
           role="combobox"
           [attr.aria-expanded]="open()"
           aria-haspopup="listbox"
           [attr.aria-label]="label()"
           tabindex="0"
           (click)="toggle()"
           (keydown.enter)="toggle()"
           (keydown.space)="toggle(); $event.preventDefault()">
        <span class="ref-select__value" [class.ref-select__value--empty]="!selectedName()">
          {{ selectedName() || placeholder() }}
        </span>
        <span class="ref-select__code" *ngIf="value() && showCode()">{{ value() }}</span>
        <button type="button" class="ref-select__clear" *ngIf="value()"
                (click)="clear(); $event.stopPropagation()"
                aria-label="Quitar selección">&times;</button>
        <span class="ref-select__caret" aria-hidden="true">▾</span>
      </div>

      <div class="ref-select__panel" *ngIf="open()">
        <input class="ref-select__search" type="text"
               [ngModel]="term()" (ngModelChange)="onSearch($event)"
               [placeholder]="'Buscar ' + label().toLowerCase()"
               [attr.aria-label]="'Buscar ' + label()"
               #searchBox />

        <p class="ref-select__hint" *ngIf="needsParent()">
          Elige antes {{ parentLabel() }}.
        </p>

        <ul class="ref-select__list" role="listbox" *ngIf="!needsParent()">
          <li *ngIf="loading()" class="ref-select__empty">Cargando…</li>
          <li *ngIf="!loading() && items().length === 0" class="ref-select__empty">
            Sin resultados para «{{ term() }}»
          </li>
          <li *ngFor="let item of items()"
              role="option"
              [attr.aria-selected]="item.code === value()"
              class="ref-select__option"
              [class.ref-select__option--active]="item.code === value()"
              (click)="pick(item)">
            <span class="ref-select__option-name">{{ item.name }}</span>
            <span class="ref-select__option-code" *ngIf="showCode()">{{ item.code }}</span>
          </li>
        </ul>
      </div>
    </div>
  `,
  styleUrls: ['./reference-select.component.scss'],
})
export class ReferenceSelectComponent {
  /** Catálogo a consultar: department, city, documentType… */
  catalog = input.required<string>();

  /** Texto del campo, usado también en los mensajes de ayuda. */
  label = input<string>('valor');

  placeholder = input<string>('Sin especificar');

  /** Muestra el código junto al nombre. Útil para DANE, molesto para países. */
  showCode = input<boolean>(true);

  /**
   * Código del que dependen los valores, en los catálogos jerárquicos: para los
   * municipios, el código del departamento. Si el catálogo lo necesita y está
   * vacío, el desplegable lo dice en vez de mostrar una lista vacía sin explicar.
   */
  parentCode = input<string | null>(null);

  /** Nombre de lo que hay que elegir antes; solo se usa en el aviso. */
  parentLabel = input<string>('el departamento');

  /** Si el catálogo cuelga de otro. */
  requiresParent = input<boolean>(false);

  /** Código seleccionado. */
  value = model<string>('');

  /** Nombre del código seleccionado, para pintarlo sin otra consulta. */
  selectedName = model<string>('');

  private readonly service = inject(ReferenceDataService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  readonly open = signal(false);
  readonly term = signal('');
  readonly items = signal<ReferenceItem[]>([]);
  readonly loading = signal(false);

  private searchTimer: any = null;

  constructor() {
    // Al cambiar el padre, lo elegido deja de ser válido: un municipio de otro
    // departamento no tiene sentido.
    effect(() => {
      const parent = this.parentCode();
      untrackedReset(this, parent);
    });
  }

  needsParent(): boolean {
    return this.requiresParent() && !this.parentCode();
  }

  toggle(): void {
    const next = !this.open();
    this.open.set(next);
    if (next && !this.needsParent()) this.load();
  }

  onSearch(value: string): void {
    this.term.set(value);
    clearTimeout(this.searchTimer);
    // Se espera a que deje de teclear: los municipios pasan del millar y una
    // consulta por pulsación satura sin aportar nada.
    this.searchTimer = setTimeout(() => this.load(), 250);
  }

  pick(item: ReferenceItem): void {
    this.value.set(item.code);
    this.selectedName.set(item.name);
    this.open.set(false);
    this.term.set('');
  }

  clear(): void {
    this.value.set('');
    this.selectedName.set('');
  }

  private load(): void {
    if (this.needsParent()) return;
    this.loading.set(true);
    this.service.get(this.catalog(), this.parentCode(), this.term()).subscribe({
      next: list => { this.items.set(list); this.loading.set(false); },
      error: () => { this.items.set([]); this.loading.set(false); },
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open()) return;
    if (!this.host.nativeElement.contains(event.target as Node)) this.open.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.open.set(false);
  }
}

/** Limpia la selección cuando cambia el padre, sin re-disparar el efecto. */
function untrackedReset(cmp: ReferenceSelectComponent, parent: string | null): void {
  if (!cmp.requiresParent()) return;
  if (!parent) {
    cmp.value.set('');
    cmp.selectedName.set('');
  }
}
