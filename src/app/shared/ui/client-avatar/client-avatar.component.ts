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
