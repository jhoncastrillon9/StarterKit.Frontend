import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CustomerService } from '../services/customer.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { ConfirmationModalComponent } from 'src/app/shared/components/reusable-modal/reusable-modal.component';
import { isValidEmail } from 'src/app/shared/email-validation';

/** Códigos de catálogo que usa el formulario. Tipado explícito y no Record<string,string>
 *  porque las plantillas de Angular en modo estricto no dejan acceder por punto a una
 *  firma de índice. */
export interface CatalogCodes {
  documentType: string;
  taxSchemeId: string;
  departmentCode: string;
  cityCode: string;
  countryCode: string;
}

@Component({
  selector: 'app-add-update-customer',
  templateUrl: './add-update-customer.component.html',
  styleUrls: ['./add-update-customer.component.scss']
})
export class AddUpdateCustomerComponent implements OnInit {
  @ViewChild('confirmationModal') confirmationModal!: ConfirmationModalComponent;
  
  customerForm: FormGroup = new FormGroup({});

  /**
   * Codigos elegidos en los desplegables de catalogo. Van fuera del FormGroup
   * porque el componente de catalogo trabaja con senales y no con ControlValueAccessor;
   * se vuelcan al formulario justo antes de guardar.
   */
  /**
   * Bloques plegables. Empiezan cerrados porque lo obligatorio para cotizar son
   * cuatro campos y, con los de la DIAN abiertos, quedaban ahogados entre treinta.
   * Si el cliente ya trae datos fiscales, se abren solos: significa que se usan.
   */
  showTax = false;
  showLocation = false;
  showContact = false;

  ref: CatalogCodes = {
    documentType: '', taxSchemeId: '', departmentCode: '', cityCode: '', countryCode: 'CO',
  };

  /** Nombre visible de cada codigo, para pintarlo sin volver a consultar. */
  refName: CatalogCodes = {
    documentType: '', taxSchemeId: '', departmentCode: '', cityCode: '', countryCode: '',
  };

  /** Copia los codigos de los desplegables al formulario reactivo. */
  private volcarCatalogos(): void {
    this.customerForm.patchValue({
      documentType: this.ref.documentType || '',
      taxSchemeId: this.ref.taxSchemeId || '',
      departmentCode: this.ref.departmentCode || '',
      departmentName: this.refName.departmentCode || '',
      cityCode: this.ref.cityCode || '',
      cityName: this.refName.cityCode || '',
      countryCode: this.ref.countryCode || '',
    });
  }

  /** Rellena los desplegables al abrir un cliente que ya existe. */
  private cargarCatalogos(customer: any): void {
    // Si ya hay datos fiscales, el bloque se abre: esconderlos sería peor.
    this.showTax = !!(customer?.documentType || customer?.registrationName || customer?.taxLevelCode);
    this.showLocation = !!(customer?.cityCode || customer?.cityName || customer?.departmentCode);
    this.showContact = !!(customer?.phone || customer?.contactName);

    this.ref.documentType = customer?.documentType || '';
    this.ref.taxSchemeId = customer?.taxSchemeId || '';
    this.ref.departmentCode = customer?.departmentCode || '';
    this.ref.cityCode = customer?.cityCode || '';
    this.ref.countryCode = customer?.countryCode || 'CO';
    this.refName.departmentCode = customer?.departmentName || '';
    this.refName.cityCode = customer?.cityName || '';
  }
  customerId?: string;
  titlePage: string = "Nuevo cliente";
  currentDate: Date = new Date();

  isModalError: boolean = false;

  // Lista de emails para el p-chips
  emailsList: string[] = [];
  emailsInvalid: boolean = false;

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
      email: [''],
      customerName: ['', [Validators.required]],
      customId: [''],
      address: [''],
      customerId: ['0'],

      // Datos para facturacion electronica (DIAN). Opcionales: la FE todavia no
      // esta activa y los clientes que ya existen no los tienen. Ver
      // CustomerDTO en el backend para las referencias al Anexo Tecnico v1.9.
      personType: [''],
      documentType: [''],
      verificationDigit: [''],
      registrationName: [''],
      commercialName: [''],
      taxLevelCode: [''],
      taxSchemeId: [''],
      cityCode: [''],
      cityName: [''],
      departmentCode: [''],
      departmentName: [''],
      postalZone: [''],
      countryCode: ['CO'],
      phone: [''],
      contactName: [''],
    });

    this.route.paramMap.subscribe(params => {
      this.customerId = params.get('id')!;

      if (this.customerId) {
        this.titlePage = "Editar cliente"
        this.spinner.show();
        this.customerService.getById(this.customerId).subscribe(
          (customer: any) => {
            this.customerForm.patchValue(customer);
            this.cargarCatalogos(customer);
            // Convertir emails separados por ; a lista
            if (customer.email) {
              this.emailsList = customer.email.split(';').map((e: string) => e.trim()).filter((e: string) => e.length > 0);
            }
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

  // Validar email al agregar
  validateEmail(event: any) {
    const addedEmail = event.value;
    if (!isValidEmail(addedEmail)) {
      // Remover el email inválido
      const index = this.emailsList.indexOf(addedEmail);
      if (index >= 0) {
        this.emailsList.splice(index, 1);
      }
      this.showModal(true, 'El correo "' + addedEmail + '" no tiene un formato válido.', 'Correo inválido');
    }
    this.onEmailsChange();
  }

  // Actualizar campo email del form cuando cambian los chips
  onEmailsChange() {
    const emailString = this.emailsList.join(';');
    this.customerForm.patchValue({ email: emailString });
    this.emailsInvalid = this.emailsList.length === 0;
  }

  onAddUpdateCustomer() {
    // Los desplegables de catalogo viven fuera del FormGroup: hay que volcarlos
    // antes de validar y enviar, o se guardarian vacios.
    this.volcarCatalogos();
    this.customerForm.markAllAsTouched();
    
    // Validar que haya al menos un email
    this.emailsInvalid = this.emailsList.length === 0;
    
    if (this.customerForm.valid && !this.emailsInvalid) {
      const formData = this.customerForm.value;
      // Asegurarse de que el email está actualizado con la lista
      formData.email = this.emailsList.join(';');
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
      if (this.emailsInvalid) {
        this.showModal(true, 'Debe agregar al menos un correo electrónico válido.', this.errorTitle);
      } else {
        this.showModal(true, this.formInvalidMessage, this.errorTitle);
      }
    }
  }

  private handleError(consoleMessage: string, modalMessage: string) {
    console.error(consoleMessage);
    this.showModal(true, modalMessage, this.errorTitle);
  }

  showModal(isError: boolean, message: string, title: string) {
    this.confirmationModal.isModalError = isError;
    this.confirmationModal.title = title;
    this.confirmationModal.messageModal = message;
    this.confirmationModal.openModal();
  }
}
