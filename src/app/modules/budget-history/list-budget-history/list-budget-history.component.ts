import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { BudgetHistoryModel, BudgetHistoryFilterRequest } from '../models/budget-history.model';
import { BudgetHistoryService } from '../services/budget-history.service';
import { IconSetService } from '@coreui/icons-angular';
import { Router } from '@angular/router';
import { cilReload, cilZoom, cilHistory } from '@coreui/icons';
import { NgxSpinnerService } from 'ngx-spinner';
import { Table } from 'primeng/table';
import { ViewEncapsulation } from '@angular/core';
import { ConfirmationModalComponent } from 'src/app/shared/components/reusable-modal/reusable-modal.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-list-budget-history',
  templateUrl: './list-budget-history.component.html',
  styleUrls: ['./list-budget-history.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ListBudgetHistoryComponent implements OnInit, OnDestroy {
  @ViewChild('confirmationModal') confirmationModal!: ConfirmationModalComponent;
  
  private readonly successRestoreMessage: string = "¡El presupuesto ha sido restaurado correctamente!";
  private readonly successRestoreTitle: string = "¡Restauración Completada!";
  private readonly errorGeneralMessage: string = "Algo salió mal. Por favor, intenta de nuevo más tarde. Si el problema persiste, no dudes en contactar con el soporte técnico o intenta refrescar la página";
  private readonly errorTitle: string = "¡Ups! ocurrió un error.";
  private readonly loadDataError: string = "Algo falló al obtener el historial. Refresca la página.";
  private readonly restoreMessage: string = "¿Estás seguro de que quieres restaurar este presupuesto? Se creará un nuevo presupuesto con los datos del historial seleccionado.";
  private readonly restoreTitleConfirmation: string = "¿Restaurar presupuesto desde historial?";

  title: string = this.successRestoreTitle;
  messageModal: string = this.successRestoreMessage;

  searchValue: string | undefined;
  loading: boolean = true;
  historyItems: BudgetHistoryModel[] = [];
  totalRecords: number = 0;
  
  // Filtros
  filterRequest: BudgetHistoryFilterRequest = new BudgetHistoryFilterRequest();
  budgetIdFilter: number | null = null;
  internalCodeFilter: number | null = null;
  userIdFilter: number | null = null;
  logCambioFilter: string = "";
  fromDateFilter: Date | null = null;
  toDateFilter: Date | null = null;

  isModalError: boolean = false;
  public visible = false;
  public historyToRestore: BudgetHistoryModel | null = null;
  private confirmSubscription?: Subscription;

  constructor(
    private budgetHistoryService: BudgetHistoryService,
    public iconSet: IconSetService,
    private router: Router,
    private spinner: NgxSpinnerService
  ) {
    iconSet.icons = { cilReload, cilZoom, cilHistory };
  }

  ngOnInit() {
    this.loadHistory();
  }

  ngOnDestroy() {
    if (this.confirmSubscription) {
      this.confirmSubscription.unsubscribe();
    }
  }

  clear(table: Table) {
    table.clear();
    this.searchValue = '';
    this.budgetIdFilter = null;
    this.internalCodeFilter = null;
    this.userIdFilter = null;
    this.logCambioFilter = "";
    this.fromDateFilter = null;
    this.toDateFilter = null;
    this.filterRequest = new BudgetHistoryFilterRequest();
    this.loadHistory();
  }

  loadHistory(event?: any) {
    this.spinner.show();
    this.loading = true;

    // Si viene del paginador de PrimeNG
    if (event) {
      this.filterRequest.page = Math.floor(event.first / event.rows) + 1;
      this.filterRequest.pageSize = event.rows;
    }

    // Aplicar filtros
    this.filterRequest.budgetId = this.budgetIdFilter || 0;
    this.filterRequest.userId = this.userIdFilter || 0;
    this.filterRequest.logCambio = this.logCambioFilter || "";
    this.filterRequest.fromDate = this.fromDateFilter;
    this.filterRequest.toDate = this.toDateFilter;

    this.budgetHistoryService.getHistory(this.filterRequest).subscribe(
      response => {
        this.historyItems = response.items;
        this.totalRecords = response.total;
        this.spinner.hide();
        this.loading = false;
      },
      (error) => {
        this.spinner.hide();
        this.loading = false;
        this.handleError('Error to Load History', this.errorGeneralMessage);
      }
    );
  }

  applyFilters() {
    this.filterRequest.page = 1; // Resetear a la primera página al aplicar filtros
    this.loadHistory();
  }

  restoreBudgetWithConfirm(history: BudgetHistoryModel) {
    this.historyToRestore = history;
    
    // Limpiar suscripción anterior si existe
    if (this.confirmSubscription) {
      this.confirmSubscription.unsubscribe();
    }
    
    this.confirmationModal.messageModal = this.restoreMessage;
    this.confirmationModal.title = this.restoreTitleConfirmation;
    this.confirmationModal.isConfirmation = true;
    this.confirmationModal.titleButtonComfimationYes = 'Si, restaurar';

    // Crear nueva suscripción
    this.confirmSubscription = this.confirmationModal.confirmAction.subscribe(() => this.restoreBudget());

    this.confirmationModal.openModal();
  }

  restoreBudget() {
    if (!this.historyToRestore) return;

    // Pequeño delay para asegurar que el modal de confirmación se cierre completamente
    setTimeout(() => {
      this.spinner.show();
      this.budgetHistoryService.restoreFromHistory(this.historyToRestore!.budgetHistoryId).subscribe(
        (response) => {
          this.spinner.hide();
          this.historyToRestore = null;
          this.showModal(false, this.successRestoreMessage, this.successRestoreTitle);
          this.loadHistory();
        },
        (error) => {
          this.spinner.hide();
          this.historyToRestore = null;
          this.handleError('Error to Restore Budget', 'No se pudo restaurar el presupuesto. Inténtalo de nuevo.');
        }
      );
    }, 300);
  }

  viewBudget(history: BudgetHistoryModel) {
    // Navegar a la vista de detalle del presupuesto
    this.router.navigate(['/budgets/read', history.budgetId]);
  }

  private handleError(logMessage: string, userMessage: string): void {
    console.error(logMessage);
    this.showModal(true, userMessage, this.errorTitle);
  }

  private showModal(isError: boolean, message: string, title: string): void {
    this.isModalError = isError;
    this.messageModal = message;
    this.title = title;
    this.confirmationModal.messageModal = message;
    this.confirmationModal.title = title;
    this.confirmationModal.isConfirmation = false;
    this.confirmationModal.isModalError = isError;
    this.confirmationModal.openModal();
  }

  toggleLiveDemo() {
    this.visible = !this.visible;
  }

  handleLiveDemoChange(event: any) {
    this.visible = event;
  }
}
