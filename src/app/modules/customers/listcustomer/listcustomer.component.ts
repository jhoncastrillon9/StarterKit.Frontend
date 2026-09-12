import { Component, OnInit, ViewChild } from '@angular/core';
import { CustomerModel } from '../models/customer.Model';
import { CustomerService } from '../services/customer.service';
import { cilPencil, cilXCircle, cilZoom, cilCloudDownload, cilNoteAdd, cilMoney } from '@coreui/icons';
import { IconSetService } from '@coreui/icons-angular';
import { Router } from '@angular/router';
import { Table } from 'primeng/table';
import { ViewEncapsulation } from '@angular/core';
import { NgxSpinnerService } from 'ngx-spinner';
import { ConfirmationModalComponent } from 'src/app/shared/components/reusable-modal/reusable-modal.component';
import { DataTableColumn, KpiDef } from 'src/app/shared/ui/data-table/data-table.types';

@Component({
  selector: 'app-listcustomer',
  templateUrl: './listcustomer.component.html',
  styleUrls: ['./listcustomer.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ListcustomerComponent implements OnInit {
  @ViewChild('confirmationModal') confirmationModal!: ConfirmationModalComponent;
  
  searchValue: string | undefined;
  loading: boolean = true;
  customers: CustomerModel[] = [];
  isModalError: boolean = false;

  tableColumns: DataTableColumn[] = [
    { field: 'customId', header: 'NIT', sortable: true, width: '150px' },
    { field: 'customerName', header: 'Nombre', sortable: true },
    { field: 'email', header: 'Email', sortable: true },
    { field: 'address', header: 'Dirección', sortable: true },
    { field: 'acciones', header: 'Acciones', align: 'right', width: '120px' },
  ];

  get kpis(): KpiDef[] {
    return [{ key: 'total', label: 'Total clientes', value: this.customers.length, dotColor: '#6d28d9' }];
  }

  private readonly successDeleteMessage: string = "¡El cliente ha sido eliminado correctamente!";
  private readonly successDeleteTitle: string = "¡Eliminación Completada!";
  private readonly errorDeleteMessage: string = "Hubo un problema al intentar eliminar el cliente. Intenta de nuevo.";
  private readonly errorTitle: string = "Oops, ocurrió un error.";
  private readonly loadDataError: string = "Algo falló al obtener los datos de los clientes. Refresca la página.";
  private readonly deleteMessage: string = "Una vez eliminado, no hay vuelta atrás... bueno, tal vez sí, pero mejor asegúrate antes de despedirlo para siempre. 😅";
  private readonly deleteTitle: string = "¿Quieres eliminar a este cliente?";
  
  title: string = this.successDeleteTitle;
  messageModal: string = this.successDeleteMessage;

  private customerToDelete?: CustomerModel; // Para almacenar el cliente que se va a eliminar

  constructor(
    private customerService: CustomerService,
    public iconSet: IconSetService,
    private router: Router,
    private spinner: NgxSpinnerService
  ) {
    iconSet.icons = { cilPencil, cilXCircle, cilZoom, cilCloudDownload, cilNoteAdd, cilMoney };
  }

  ngOnInit() {
    this.loadCustomers();
  }

  loadCustomers() {
    this.spinner.show();
    this.customerService.get().subscribe(
      (customers) => {
        this.customers = customers;
        this.loading = false;
        this.spinner.hide();
      },
      (error) => {
        this.spinner.hide();
        this.handleError('Error al cargar clientes', this.loadDataError);
      }
    );
  }

  clear(table: Table) {
    table.clear();
    this.searchValue = '';
  }

  // Abre el modal de confirmación antes de eliminar
  confirmDeleteCustomer(customerModel: CustomerModel) {
    this.customerToDelete = customerModel; // Guardamos el cliente que se va a eliminar
    this.confirmationModal.messageModal = this.deleteMessage;
    this.confirmationModal.title = this.deleteTitle;
    this.confirmationModal.isConfirmation = true;
    this.confirmationModal.titleButtonComfimationYes = 'Si, Eliminar';

    // La accion de confirmar se enlaza por plantilla ((confirmAction)="onDeleteConfirmed()").
    // Antes se suscribia aqui en cada apertura y solo no duplicaba el borrado porque
    // ConfirmationModalComponent.closeModal() recreaba el EventEmitter. Ese reemplazo ya
    // no existe, asi que suscribirse aqui acumularia suscripciones.
    this.confirmationModal.openModal(); // Abrimos el modal
  }

  /** Punto de entrada del binding de plantilla al confirmar la eliminacion. */
  onDeleteConfirmed() {
    const customer = this.customerToDelete;
    this.customerToDelete = undefined;
    if (customer) { this.deleteCustomer(customer); }
  }

  // Método para eliminar un cliente
  deleteCustomer(customerModel: CustomerModel) {
    this.spinner.show();
    this.customerService.delete(customerModel.customerId).subscribe(
      (response: any) => {
        this.spinner.hide();
        this.loadCustomers();
        this.showNotify()
      },
      (error) => {
        this.spinner.hide();
        this.handleError('Error al eliminar cliente', this.errorDeleteMessage);
      }
    );
  }

  private handleError(consoleMessage: string, modalMessage: string) {
    console.error(consoleMessage);
    this.showModal(true, modalMessage, this.errorTitle);
  }

  showModal(isError: boolean, message: string, title: string) {
    this.confirmationModal.isModalError = isError;
    this.confirmationModal.title = title;
    this.confirmationModal.messageModal = message;
    this.confirmationModal.isConfirmation = false; // Aseguramos que no esté en modo confirmación
    this.confirmationModal.openModal();
  }
  showNotify(){
    console.log('show notify');
  }
}
