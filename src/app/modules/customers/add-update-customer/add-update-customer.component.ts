import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CustomerService } from '../services/customer.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { ConfirmationModalComponent } from 'src/app/shared/components/reusable-modal/reusable-modal.component';

@Component({
  selector: 'app-add-update-customer',
  templateUrl: './add-update-customer.component.html',
  styleUrls: ['./add-update-customer.component.scss']
})
export class AddUpdateCustomerComponent implements OnInit {
  @ViewChild('confirmationModal') confirmationModal!: ConfirmationModalComponent;
  
  customerForm: FormGroup = new FormGroup({});
  customerId?: string;
  isModalError: boolean = false;

  // Mensajes para el módulo de clientes
  private readonly successAddMessage: string = "¡El cliente ha sido creado exitosamente!";
  private readonly successUpdateMessage: string = "¡El cliente ha sido actualizado correctamente!";
  private readonly errorMessage: string = "Hubo un problema al procesar los datos del cliente. Intenta de nuevo.";
  private readonly errorTitle: string = "Oops, ocurrió un error.";
  private readonly formInvalidMessage: string = "El formulario necesita ser completado correctamente. Por favor, revisa los campos.";

  title: string = this.successAddMessage;
  messageModal: string = this.successAddMessage;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private customerService: CustomerService,
    private spinner: NgxSpinnerService
  ) { }

  ngOnInit() {
    this.customerForm = this.fb.group({
      email: ['', [Validators.email]],
      customerName: ['', [Validators.required]],
      customId: [''],
      address: [''],  
      customerId: ['0'],
    });

    this.route.paramMap.subscribe(params => {
      this.customerId = params.get('id')!;

      if (this.customerId) {
        this.spinner.show();
        this.customerService.getById(this.customerId).subscribe(
          (customer: any) => {
            this.customerForm.patchValue(customer);
            this.spinner.hide();
          },
          (error) => {
            this.spinner.hide();
            this.handleError('Error al cargar datos del cliente', this.errorMessage);
          }
        );
      }
    });
  }

  onAddUpdateCustomer() {
    if (this.customerForm.valid) {
      const formData = this.customerForm.value;
      this.spinner.show();

      if (this.customerId) {
        this.customerService.update(formData).subscribe(
          (response: any) => {
            this.spinner.hide();
            this.showModal(false, this.successUpdateMessage, this.successUpdateMessage);
            this.router.navigate(['/customers/customers']);
          },
          (error) => {
            this.spinner.hide();
            this.handleError('Error al actualizar cliente', this.errorMessage);
          }
        );
      } else {
        this.customerService.add(formData).subscribe(
          (response: any) => {
            this.spinner.hide();            
            this.router.navigate(['/customers/customers']);
            this.showModal(false, this.successAddMessage, this.successAddMessage);
          },
          (error) => {
            this.spinner.hide();
            this.handleError('Error al crear cliente', this.errorMessage);
          }
        );
      }
    } else {
      this.showModal(true, this.formInvalidMessage, this.errorTitle);
    }
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
