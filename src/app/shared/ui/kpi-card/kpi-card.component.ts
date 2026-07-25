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
