import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, ViewEncapsulation, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReferenceSelectComponent } from '../../shared/ui/reference-select/reference-select.component';
import { ElectronicInvoicingService, InvoiceBalance, NoteLine } from './electronic-invoicing.service';

/**
 * Corregir una factura emitida.
 *
 * Empieza por la factura y no por un menú suelto a propósito: una nota siempre
 * nace de una factura concreta, y elegir primero la factura evita la mitad de
 * los errores posibles.
 *
 * El orden de las preguntas también importa: qué tipo de corrección, por qué, y
 * solo entonces cuánto. Para una anulación ni siquiera pregunta el importe,
 * porque una anulación es por el total.
 */
@Component({
  selector: 'app-correct-invoice-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReferenceSelectComponent],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './correct-invoice-modal.component.html',
  styleUrls: ['./correct-invoice-modal.component.scss'],
})
export class CorrectInvoiceModalComponent {
  private readonly service = inject(ElectronicInvoicingService);

  @Output() corrected = new EventEmitter<void>();

  open = signal(false);
  saving = signal(false);
  error = signal('');
  done = signal<{ number: string; message: string; qrUrl?: string | null } | null>(null);

  invoiceId = 0;
  invoiceNumber = '';
  balance = signal<InvoiceBalance | null>(null);

  form = {
    noteType: 1,
    reasonCode: '',
    note: '',
    description: '',
    amount: 0,
    ivaRate: 19,
  };

  /** Una anulación deshace la factura entera: no se pregunta el importe. */
  get esAnulacion(): boolean {
    return this.form.noteType === 1 && this.form.reasonCode === '2';
  }

  get catalogo(): string {
    return this.form.noteType === 2 ? 'debitNoteReason' : 'creditNoteReason';
  }

  get total(): number {
    if (this.esAnulacion) return this.balance()?.total ?? 0;
    return this.form.amount + Math.round(this.form.amount * this.form.ivaRate / 100);
  }

  show(invoiceId: number, invoiceNumber: string): void {
    this.invoiceId = invoiceId;
    this.invoiceNumber = invoiceNumber;
    this.error.set('');
    this.done.set(null);
    this.form = { noteType: 1, reasonCode: '', note: '', description: '', amount: 0, ivaRate: 19 };
    this.balance.set(null);
    this.open.set(true);

    this.service.getBalance(invoiceId).subscribe({
      next: b => this.balance.set(b),
      error: e => this.error.set(e?.error?.error ?? 'No se pudo leer el estado de la factura.'),
    });
  }

  close(): void {
    this.open.set(false);
    if (this.done()) this.corrected.emit();
  }

  /** Cambiar de tipo invalida el motivo: las dos tablas no comparten códigos. */
  onTypeChange(): void {
    this.form.reasonCode = '';
  }

  puedeGuardar(): boolean {
    if (!this.form.reasonCode) return false;
    if (this.esAnulacion) return true;
    return this.form.amount > 0 && this.form.description.trim().length > 0;
  }

  guardarYEmitir(): void {
    this.saving.set(true);
    this.error.set('');

    const lines: NoteLine[] = this.esAnulacion ? [] : [{
      description: this.form.description.trim(),
      unitMeasurement: 'Und',
      quantity: 1,
      unitPrice: this.form.amount,
      ivaRate: this.form.ivaRate,
    }];

    this.service.createNote({
      noteType: this.form.noteType,
      invoiceId: this.invoiceId,
      reasonCode: this.form.reasonCode,
      note: this.form.note,
      lines,
    }).subscribe({
      next: nota => {
        this.service.issueNote(nota.creditDebitNoteId).subscribe({
          next: r => {
            this.saving.set(false);
            this.done.set({ number: r.number ?? '', message: r.message, qrUrl: r.qrUrl });
          },
          error: e => {
            this.saving.set(false);
            // La nota quedó en borrador: se dice, para que nadie la cree dos veces.
            this.error.set((e?.error?.error ?? 'No se pudo emitir la nota.') +
              ' La nota quedó guardada como borrador.');
          },
        });
      },
      error: e => {
        this.saving.set(false);
        this.error.set(e?.error?.error ?? 'No se pudo crear la nota.');
      },
    });
  }
}
