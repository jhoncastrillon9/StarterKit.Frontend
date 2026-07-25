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
