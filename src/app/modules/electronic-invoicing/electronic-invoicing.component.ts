import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewEncapsulation, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReferenceSelectComponent } from '../../shared/ui/reference-select/reference-select.component';
import {
  ElectronicInvoicingService, ElectronicInvoicingSetup, IssueResult, Note,
} from './electronic-invoicing.service';

/**
 * Configuración de facturación electrónica.
 *
 * La pantalla es un camino, no un formulario, porque el trámite es un camino:
 * siete pasos que pasan por el portal de la DIAN, por una entidad certificadora
 * y por el MUISCA, y que tardan semanas. La mayoría no se hacen aquí.
 *
 * Por eso cada paso dice tres cosas: qué hay que hacer, POR QUÉ hace falta y
 * dónde se hace. Un trámite sin motivo se pospone, y quien abandona esto no
 * abandona porque el software sea difícil: abandona porque no sabe qué sigue.
 */
@Component({
  selector: 'app-electronic-invoicing',
  standalone: true,
  imports: [CommonModule, FormsModule, ReferenceSelectComponent],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './electronic-invoicing.component.html',
  styleUrls: ['./electronic-invoicing.component.scss'],
})
export class ElectronicInvoicingComponent implements OnInit {
  private readonly service = inject(ElectronicInvoicingService);

  setup = signal<ElectronicInvoicingSetup | null>(null);
  notes = signal<Note[]>([]);
  loading = signal(true);
  saving = signal(false);
  message = signal('');
  error = signal('');
  lastResult = signal<IssueResult | null>(null);

  /** Paso abierto. Solo uno a la vez: la lista entera abierta no se lee. */
  openStep = signal<string>('');

  form = {
    softwareId: '',
    softwarePin: '',
    testSetId: '',
    environment: 2,
  };

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.getSetup().subscribe({
      next: s => {
        this.setup.set(s);
        this.form.softwareId = s.softwareId ?? '';
        this.form.softwarePin = s.softwarePin ?? '';
        this.form.testSetId = s.testSetId ?? '';
        this.form.environment = s.environment;
        this.loading.set(false);

        // Se abre el primer paso que falta: es donde está el usuario.
        const pendiente = s.steps.find(p => p.status !== 'Hecho');
        this.openStep.set(pendiente?.key ?? '');
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudo cargar la configuración de facturación electrónica.');
      },
    });

    this.service.getNotes().subscribe({ next: n => this.notes.set(n), error: () => {} });
  }

  toggleStep(key: string): void {
    this.openStep.set(this.openStep() === key ? '' : key);
  }

  save(): void {
    this.saving.set(true);
    this.error.set('');
    this.service.updateSetup({
      softwareId: this.form.softwareId,
      softwarePin: this.form.softwarePin,
      testSetId: this.form.testSetId,
      environment: this.form.environment,
    }).subscribe({
      next: s => {
        this.setup.set(s);
        this.saving.set(false);
        this.message.set('Guardado.');
        setTimeout(() => this.message.set(''), 2500);
      },
      error: e => {
        this.saving.set(false);
        this.error.set(e?.error?.error ?? 'No se pudo guardar.');
      },
    });
  }

  /** Marca a mano un paso que ocurre fuera de la aplicación. */
  markStep(key: string): void {
    const actual = this.setup();
    if (!actual) return;

    const hechos = new Set(actual.steps.filter(p => p.status === 'Hecho' && p.manualCheck).map(p => p.key));
    hechos.has(key) ? hechos.delete(key) : hechos.add(key);

    this.service.updateSetup({ completedSteps: [...hechos].join(';') })
      .subscribe({ next: s => this.setup.set(s) });
  }

  descargarXml(note: Note): void {
    const tipo = note.noteType === 2 ? 'DebitNote' : 'CreditNote';
    this.service.downloadXml(tipo, note.creditDebitNoteId).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${note.fullNumber ?? 'nota'}.xml`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.error.set('Todavía no se ha generado el XML de esa nota.'),
    });
  }

  // ---------------------------------------------------------- presentación

  iconoDe(status: string): string {
    if (status === 'Hecho') return 'fa-circle-check';
    if (status === 'EnCurso') return 'fa-clock';
    return 'fa-circle';
  }

  pasosHechos(): number {
    return this.setup()?.steps.filter(p => p.status === 'Hecho').length ?? 0;
  }

  totalPasos(): number {
    return this.setup()?.steps.length ?? 0;
  }

  fecha(v?: string | null): string {
    return v ? new Date(v).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
  }
}
