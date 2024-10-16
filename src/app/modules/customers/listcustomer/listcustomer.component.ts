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

  // Mensajes para el módulo de clientes
  private readonly successDeleteMessage: string = "¡El cliente ha sido eliminado correctamente!";
  private readonly successDeleteTitle: string = "¡Eliminación Completada!";
  private readonly errorDeleteMessage: string = "Hubo un problema al intentar eliminar el cliente. Intenta de nuevo.";
  private readonly errorTitle: string = "Oops, ocurrió un error.";
  private readonly loadDataError: string = "Algo falló al obtener los datos de los clientes. Refresca la página.";

  title: string = this.successDeleteTitle;
  messageModal: string = this.successDeleteMessage;

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

  deleteCustomer(customerModel: CustomerModel) {
    this.spinner.show();
    this.customerService.delete(customerModel.customerId).subscribe(
      (response: any) => {
        this.spinner.hide();
        this.loadCustomers();
        this.showModal(false, this.successDeleteMessage, this.successDeleteTitle);
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
    this.isModalError = isError;
    this.title = title;
    this.messageModal = message;
    this.confirmationModal.openModal();
  }
}
