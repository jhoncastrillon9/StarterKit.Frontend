import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from 'src/environment';

export interface ScheduleTask {
  scheduleTaskId: number;
  phase?: string | null;
  name: string;
  startDate: string;
  durationDays: number;
  endDate: string;
  responsible?: string | null;
  status: string;
  progressPercent: number;
  sortOrder: number;
}

export interface Schedule {
  scheduleId: number;
  budgetId?: number | null;
  customerId?: number | null;
  customerName?: string | null;
  name: string;
  startDate: string;
  endDate: string;
  notes?: string | null;
  createdAt: string;
  progressPercent: number;
  totalDays: number;
  tasks: ScheduleTask[];
}

interface BudgetOption {
  budgetId: number;
  internalCode: number;
  budgetName: string;
}

/**
 * Cronogramas de obra.
 *
 * El cronograma que sale de una cotización es un BORRADOR y la pantalla lo dice:
 * la aplicación reparte los días por el peso de cada partida, que es una
 * estimación razonable, no una planificación. Lo que ahorra tiempo es no partir
 * de una hoja en blanco.
 */
@Component({
  selector: 'app-schedules',
  standalone: true,
  imports: [CommonModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './schedules.component.html',
  styleUrls: ['./schedules.component.scss'],
})
export class SchedulesComponent implements OnInit {
  schedules: Schedule[] = [];
  budgets: BudgetOption[] = [];
  current: Schedule | null = null;

  loading = true;
  saving = false;
  error = '';
  message = '';
  showCreate = false;

  create = {
    budgetId: null as number | null,
    name: '',
    startDate: new Date().toISOString().slice(0, 10),
    totalDays: 60,
  };

  readonly statuses = [
    { value: 'Pendiente', label: 'Pendiente' },
    { value: 'EnCurso', label: 'En curso' },
    { value: 'Terminada', label: 'Terminada' },
  ];

  private readonly apiUrl = `${environment.apiUrl}/api/Schedule`;

  constructor(private http: HttpClient) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    });
  }

  ngOnInit(): void {
    this.load();
    this.loadBudgets();
  }

  load(): void {
    this.loading = true;
    this.http.get<Schedule[]>(this.apiUrl, { headers: this.headers() }).subscribe({
      next: s => { this.schedules = s; this.loading = false; },
      error: () => { this.loading = false; this.error = 'No se pudieron cargar los cronogramas.'; },
    });
  }

  loadBudgets(): void {
    this.http.get<any[]>(`${environment.apiUrl}/api/Budget/GetAllWithDetails`, { headers: this.headers() })
      .subscribe({
        next: b => {
          this.budgets = (b || [])
            .map(x => ({ budgetId: x.budgetId, internalCode: x.internalCode, budgetName: x.budgetName }))
            .sort((a, c) => c.internalCode - a.internalCode)
            .slice(0, 100);
        },
        error: () => { /* se puede crear un cronograma sin cotización */ },
      });
  }

  open(s: Schedule): void {
    this.http.get<Schedule>(`${this.apiUrl}/${s.scheduleId}`, { headers: this.headers() })
      .subscribe({ next: d => { this.current = d; this.message = ''; } });
  }

  close(): void {
    this.current = null;
  }

  doCreate(): void {
    this.saving = true;
    this.http.post<Schedule>(this.apiUrl, {
      budgetId: this.create.budgetId,
      name: this.create.name || null,
      startDate: this.create.startDate,
      totalDays: this.create.totalDays,
    }, { headers: this.headers() }).subscribe({
      next: s => {
        this.saving = false;
        this.showCreate = false;
        this.schedules = [s, ...this.schedules];
        this.current = s;
        this.create = { budgetId: null, name: '', startDate: new Date().toISOString().slice(0, 10), totalDays: 60 };
        this.message = s.tasks.length
          ? `Borrador con ${s.tasks.length} actividades. Ajusta fechas y responsables.`
          : 'Cronograma creado. Agrega las actividades.';
      },
      error: e => {
        this.saving = false;
        this.message = e?.error?.error || 'No se pudo crear el cronograma.';
      },
    });
  }

  addTask(): void {
    if (!this.current) return;
    const ultima = this.current.tasks[this.current.tasks.length - 1];
    // La nueva empieza cuando acaba la anterior: encadenar es lo habitual en obra.
    const inicio = ultima
      ? new Date(new Date(ultima.endDate).getTime() + 86_400_000).toISOString().slice(0, 10)
      : this.current.startDate.slice(0, 10);

    this.current.tasks = [...this.current.tasks, {
      scheduleTaskId: 0,
      phase: ultima?.phase ?? '',
      name: '',
      startDate: inicio,
      durationDays: 1,
      endDate: inicio,
      responsible: '',
      status: 'Pendiente',
      progressPercent: 0,
      sortOrder: this.current.tasks.length,
    }];
  }

  removeTask(index: number): void {
    if (!this.current) return;
    this.current.tasks = this.current.tasks.filter((_, i) => i !== index);
  }

  save(): void {
    if (!this.current) return;
    this.saving = true;
    this.http.put<Schedule>(this.apiUrl, {
      scheduleId: this.current.scheduleId,
      name: this.current.name,
      startDate: this.current.startDate,
      notes: this.current.notes,
      tasks: this.current.tasks,
    }, { headers: this.headers() }).subscribe({
      next: s => {
        this.saving = false;
        this.current = s;
        this.schedules = this.schedules.map(x => x.scheduleId === s.scheduleId ? s : x);
        this.message = 'Cronograma guardado.';
      },
      error: e => {
        this.saving = false;
        this.message = e?.error?.error || 'No se pudo guardar.';
      },
    });
  }

  remove(s: Schedule): void {
    if (!confirm(`¿Eliminar "${s.name}"?`)) return;
    this.http.delete(`${this.apiUrl}/${s.scheduleId}`, { headers: this.headers() }).subscribe({
      next: () => {
        this.schedules = this.schedules.filter(x => x.scheduleId !== s.scheduleId);
        if (this.current?.scheduleId === s.scheduleId) this.current = null;
      },
      error: () => this.message = 'No se pudo eliminar.',
    });
  }

  /** Imprimir da un PDF sin depender de que el servidor lo genere. */
  print(): void {
    window.print();
  }

  // ------------------------------------------------------------ Presentación

  fecha(v?: string | null): string {
    return v ? new Date(v).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) : '—';
  }

  fechaLarga(v?: string | null): string {
    return v ? new Date(v).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
  }

  /** Posición de la barra en la línea de tiempo, en porcentaje. */
  barOffset(task: ScheduleTask): number {
    if (!this.current) return 0;
    const inicio = new Date(this.current.startDate).getTime();
    const fin = new Date(this.current.endDate).getTime();
    const total = Math.max(1, fin - inicio);
    return Math.max(0, ((new Date(task.startDate).getTime() - inicio) / total) * 100);
  }

  barWidth(task: ScheduleTask): number {
    if (!this.current) return 2;
    const inicio = new Date(this.current.startDate).getTime();
    const fin = new Date(this.current.endDate).getTime();
    const total = Math.max(1, fin - inicio);
    const dura = Math.max(1, task.durationDays) * 86_400_000;
    // Mínimo visible: una actividad de un día en una obra de seis meses
    // desaparecería si se dibujara a escala exacta.
    return Math.max(1.5, (dura / total) * 100);
  }

  statusLabel(status: string): string {
    return this.statuses.find(s => s.value === status)?.label ?? status;
  }

  /** Fases distintas, en orden de aparición, para agrupar visualmente. */
  phases(): string[] {
    if (!this.current) return [];
    const vistas: string[] = [];
    for (const t of this.current.tasks) {
      const f = t.phase || 'Sin fase';
      if (!vistas.includes(f)) vistas.push(f);
    }
    return vistas;
  }

  tasksOf(phase: string): ScheduleTask[] {
    if (!this.current) return [];
    return this.current.tasks.filter(t => (t.phase || 'Sin fase') === phase);
  }

  indexOf(task: ScheduleTask): number {
    return this.current?.tasks.indexOf(task) ?? -1;
  }
}
