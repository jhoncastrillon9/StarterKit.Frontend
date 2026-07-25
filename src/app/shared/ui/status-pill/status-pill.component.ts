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
      @if (caret()) { <span class="dc-pill__caret">▾</span> }
    </span>
  `,
  styleUrls: ['./status-pill.component.scss'],
})
export class StatusPillComponent {
  status = input<string>('');
  /** When true, renders a subtle dropdown caret inside the pill. */
  caret = input<boolean>(false);
  colors = computed<PillColors>(() => STATUS_COLORS[this.status()] ?? NEUTRAL);
}
