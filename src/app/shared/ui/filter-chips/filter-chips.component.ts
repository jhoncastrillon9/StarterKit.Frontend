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
