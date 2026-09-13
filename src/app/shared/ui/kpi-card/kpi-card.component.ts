import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Tarjeta de KPI.
 *
 * Se pinta como `<button>` SOLO si quien la usa se ha suscrito a `cardClick` y
 * lo declara con `[interactive]="true"`. Un botón que no hace nada se anuncia
 * igual al lector de pantalla y se recorre con el tabulador sin resultado; las
 * tarjetas meramente informativas son un `<div>`, que es lo que son.
 */
@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (interactive()) {
      <button type="button" class="dc-kpi" [class.dc-kpi--active]="active()" (click)="cardClick.emit()">
        <ng-container [ngTemplateOutlet]="content"></ng-container>
      </button>
    } @else {
      <div class="dc-kpi dc-kpi--static" [class.dc-kpi--active]="active()">
        <ng-container [ngTemplateOutlet]="content"></ng-container>
      </div>
    }

    <ng-template #content>
      <span class="dc-kpi__dot" [style.background]="dotColor()"></span>
      <span class="dc-kpi__body">
        <span class="dc-kpi__value">{{ value() }}</span>
        <span class="dc-kpi__label">{{ label() }}</span>
      </span>
      @if (share()) { <span class="dc-kpi__share">{{ share() }}</span> }
    </ng-template>
  `,
  styleUrls: ['./kpi-card.component.scss'],
})
export class KpiCardComponent {
  value = input<string | number>('');
  label = input<string>('');
  dotColor = input<string>('#6d28d9');
  share = input<string>('');
  active = input<boolean>(false);
  /** `true` solo si el consumidor escucha `cardClick`. */
  interactive = input<boolean>(false);
  cardClick = output<void>();
}
