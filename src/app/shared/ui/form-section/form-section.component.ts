import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation, input, model } from '@angular/core';

/**
 * Bloque de un formulario, opcionalmente plegable.
 *
 * Existe por un problema concreto: al añadir los campos que pide la DIAN, los
 * formularios de cliente, empresa y producto pasaron de cinco campos a treinta, y
 * lo obligatorio quedó ahogado entre lo opcional. Todo pesaba igual y la pantalla
 * se leía plana.
 *
 * Con esto, lo que hace falta para trabajar hoy está abierto y lo que hace falta
 * para facturar más adelante está plegado, con su motivo escrito. El usuario ve
 * que existe sin tener que atravesarlo.
 */
@Component({
  selector: 'app-form-section',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <section class="fs" [class.fs--collapsible]="collapsible()" [class.fs--open]="isOpen()">
      <header class="fs__head"
              [attr.role]="collapsible() ? 'button' : null"
              [attr.tabindex]="collapsible() ? 0 : null"
              [attr.aria-expanded]="collapsible() ? isOpen() : null"
              (click)="toggle()"
              (keydown.enter)="toggle()"
              (keydown.space)="toggle(); $event.preventDefault()">
        <span class="fs__icon" *ngIf="icon()"><i class="fas" [ngClass]="icon()" aria-hidden="true"></i></span>

        <span class="fs__titles">
          <span class="fs__title">
            {{ title() }}
            <span class="fs__badge" *ngIf="optional()">opcional</span>
          </span>
          <span class="fs__why" *ngIf="why()">{{ why() }}</span>
        </span>

        <span class="fs__chevron" *ngIf="collapsible()" aria-hidden="true">
          <i class="fas" [ngClass]="isOpen() ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
        </span>
      </header>

      <div class="fs__body" *ngIf="isOpen()">
        <ng-content></ng-content>
      </div>
    </section>
  `,
  styleUrls: ['./form-section.component.scss'],
})
export class FormSectionComponent {
  title = input.required<string>();

  /** Por qué existe este bloque. Una línea, en el idioma del usuario. */
  why = input<string>('');

  icon = input<string>('');

  /** Marca el bloque como no imprescindible y lo pliega por defecto. */
  optional = input<boolean>(false);

  collapsible = input<boolean>(false);

  /** Estado del plegado. Se puede controlar desde fuera. */
  open = model<boolean>(true);

  isOpen(): boolean {
    return !this.collapsible() || this.open();
  }

  toggle(): void {
    if (!this.collapsible()) return;
    this.open.set(!this.open());
  }
}
