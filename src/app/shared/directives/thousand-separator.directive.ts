import { Directive, ElementRef, HostListener, Optional } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[appThousandSeparator]'
})
export class ThousandSeparatorDirective {
  private previousValue: string = '';

  constructor(
    private el: ElementRef,
    @Optional() private ngControl: NgControl
  ) {}

  @HostListener('input', ['$event'])
  onInput(event: any): void {
    const input = event.target as HTMLInputElement;
    let value = input.value;

    // Eliminar todos los caracteres que no sean dígitos
    const numericValue = value.replace(/\D/g, '');

    // Si el valor está vacío, limpiar todo
    if (numericValue === '') {
      this.updateValues('', '');
      return;
    }

    // Formatear el valor con separadores de miles
    const formattedValue = this.formatWithThousandSeparator(numericValue);

    // Actualizar los valores
    this.updateValues(numericValue, formattedValue);
  }

  @HostListener('blur', ['$event'])
  onBlur(event: any): void {
    const input = event.target as HTMLInputElement;
    let value = input.value;

    // Eliminar todos los caracteres que no sean dígitos
    const numericValue = value.replace(/\D/g, '');

    if (numericValue !== '') {
      const formattedValue = this.formatWithThousandSeparator(numericValue);
      this.updateValues(numericValue, formattedValue);
    }
  }

  @HostListener('focus', ['$event'])
  onFocus(event: any): void {
    const input = event.target as HTMLInputElement;
    // Mantener el formato cuando se hace foco
    if (input.value) {
      const numericValue = input.value.replace(/\D/g, '');
      if (numericValue) {
        const formattedValue = this.formatWithThousandSeparator(numericValue);
        input.value = formattedValue;
      }
    }
  }

  private formatWithThousandSeparator(value: string): string {
    // Convertir a número y luego aplicar el formato con separador de miles
    return parseInt(value, 10).toLocaleString('es-ES');
  }

  private updateValues(numericValue: string, formattedValue: string): void {
    const input = this.el.nativeElement as HTMLInputElement;
    
    // Actualizar el valor del input con el formato visual
    input.value = formattedValue;

    // Actualizar el valor del FormControl con el número sin formato
    if (this.ngControl && this.ngControl.control) {
      // Evitar emitir eventos innecesarios si el valor no ha cambiado
      if (this.ngControl.control.value !== numericValue) {
        this.ngControl.control.setValue(numericValue, { emitEvent: false });
      }
    }
  }
}
