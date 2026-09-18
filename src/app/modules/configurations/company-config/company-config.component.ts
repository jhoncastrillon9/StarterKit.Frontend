import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CompanyService } from '../services/company.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { ConfirmationModalComponent } from 'src/app/shared/components/reusable-modal/reusable-modal.component';

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
  selector: 'app-company-config',
  templateUrl: './company-config.component.html',
  styleUrls: ['./company-config.component.scss']
})
export class CompanyConfigComponent implements OnInit, OnDestroy {
  @ViewChild('confirmationModal') confirmationModal!: ConfirmationModalComponent;
  isModalError: boolean = false;

  companyForm: FormGroup;
  companyId?: string = '0';  
  selectedFile: File | null = null;
  urlImageLogo: string = '';

  /** Logo por defecto cuando la empresa todavia no ha subido ninguno. */
  private readonly defaultLogo =
    'https://cotizaconstructorstorage.blob.core.windows.net/logos/8cbe1a7d-e127-48a0-81d6-19150f45234c.png';

  /** Tamano maximo del logo. Por encima, el upload suele fallar en el backend. */
  private readonly maxLogoBytes = 2 * 1024 * 1024;

  /**
   * URL local (blob:) del archivo recien elegido. Existe para que la vista previa
   * cambie en el momento: antes solo se guardaba el File y la imagen no se
   * actualizaba hasta guardar y recargar, con lo que el usuario no sabia si habia
   * elegido bien el archivo.
   */
  previewUrl: string | null = null;

  /**
   * Codigos elegidos en los desplegables de catalogo. Van fuera del FormGroup
   * porque el componente de catalogo usa senales y no ControlValueAccessor; se
   * vuelcan al formulario justo antes de guardar.
   */
  /** Bloques plegables: lo fiscal no debe tapar los datos que se usan a diario. */
  showTax = false;
  showLocation = false;

  ref: CatalogCodes = {
    documentType: '', taxSchemeId: '', departmentCode: '', cityCode: '', countryCode: 'CO',
  };

  refName: CatalogCodes = {
    documentType: '', taxSchemeId: '', departmentCode: '', cityCode: '', countryCode: '',
  };

  private volcarCatalogos(): void {
    this.companyForm.patchValue({
      documentType: this.ref.documentType || '',
      taxSchemeId: this.ref.taxSchemeId || '',
      departmentCode: this.ref.departmentCode || '',
      departmentName: this.refName.departmentCode || '',
      cityCode: this.ref.cityCode || '',
      cityName: this.refName.cityCode || '',
      countryCode: this.ref.countryCode || '',
    });
  }

  private cargarCatalogos(company: any): void {
    this.showTax = !!(company?.documentType || company?.registrationName || company?.economicActivityCode);
    this.showLocation = !!(company?.cityCode || company?.cityName || company?.departmentCode);

    this.ref.documentType = company?.documentType || '';
    this.ref.taxSchemeId = company?.taxSchemeId || '';
    this.ref.departmentCode = company?.departmentCode || '';
    this.ref.cityCode = company?.cityCode || '';
    this.ref.countryCode = company?.countryCode || 'CO';
    this.refName.departmentCode = company?.departmentName || '';
    this.refName.cityCode = company?.cityName || '';
  }

  // Mensajes reutilizables
  private readonly successMessage: string = "¡Los datos de tu empresa han sido actualizados con éxito!";
  private readonly successTitle: string = "¡Actualización Completada!";
  private readonly errorTitle: string = "Oops, ocurrió un error.";
  private readonly formErrorTitle: string = "Oops, Faltan datos";
  private readonly loadDataError: string = "Algo falló al obtener los datos, refresca la página F5.";  
  private readonly updateErrorMessage: string = "Algo falló al actualizar la info de tu empresa. Intenta de nuevo, que a la segunda va la vencida.";
  private readonly formInvalidMessage: string = "El formulario necesita un poco más de amor. Completa los campos correctamente y listo. 🚀";

  title: string = this.successTitle;
  messageModal: string = this.successMessage;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private companyService: CompanyService,
    private spinner: NgxSpinnerService
  ) {
    this.companyForm = this.fb.group({
      email: ['', [Validators.email, Validators.required]],
      companyName: ['', [Validators.required]],
      address: [''],
      companyId: [''],
      document: [''],
      telephones: [''],
      urlImageLogo: [''],
      fileLogo: [''],
      urlWeb: [''],

      // Datos del emisor para facturacion electronica (DIAN). Opcionales: la FE
      // no esta activa. Ver CompanyDTO en el backend para la referencia al anexo.
      personType: [''],
      documentType: [''],
      verificationDigit: [''],
      registrationName: [''],
      taxLevelCode: [''],
      taxSchemeId: [''],
      economicActivityCode: [''],
      economicActivityName: [''],
      commercialRegistration: [''],
      cityCode: [''],
      cityName: [''],
      departmentCode: [''],
      departmentName: [''],
      postalZone: [''],
      countryCode: ['CO'],
    });
  }

  ngOnInit() {
    this.spinner.show();
    this.companyService.getCompanyByUser().subscribe(
      (company: any) => {
        if (company) {
          this.companyForm.patchValue({
            email: company.email || '',
            companyName: company.companyName || '',
            address: company.address || '',
            companyId: company.companyId || '',
            document: company.document || '',
            telephones: company.telephones || '',
            urlWeb: company.urlWeb || '',
            personType: company.personType || '',
            documentType: company.documentType || '',
            verificationDigit: company.verificationDigit || '',
            registrationName: company.registrationName || '',
            taxLevelCode: company.taxLevelCode || '',
            taxSchemeId: company.taxSchemeId || '',
            economicActivityCode: company.economicActivityCode || '',
            economicActivityName: company.economicActivityName || '',
            commercialRegistration: company.commercialRegistration || '',
            cityCode: company.cityCode || '',
            cityName: company.cityName || '',
            departmentCode: company.departmentCode || '',
            departmentName: company.departmentName || '',
            postalZone: company.postalZone || '',
            countryCode: company.countryCode || ''
          });
          this.urlImageLogo = company.urlImageLogo || '';
          this.cargarCatalogos(company);
        }
        this.spinner.hide();
      },
      (error: any) => {
        this.handleError('Error al consultar empresa', this.loadDataError);
        this.spinner.hide();
      }
    );
  }

  /** Imagen que se muestra: la recien elegida, la guardada, o la de por defecto. */
  get logoSrc(): string {
    return this.previewUrl || this.urlImageLogo || this.defaultLogo;
  }

  /** True si hay un archivo elegido pendiente de guardar. */
  get hasPendingLogo(): boolean {
    return !!this.selectedFile;
  }

  onFileSelected(event: any) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Si el usuario abre el dialogo y cancela, no hay archivo: se deja todo como estaba.
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      input.value = '';
      this.showModal(true, 'Solo puedes cargar archivos de tipo imagenes 😉', this.errorTitle);
      return;
    }

    if (file.size > this.maxLogoBytes) {
      input.value = '';
      this.showModal(true, 'La imagen no puede pesar mas de 2 MB. Prueba con una mas ligera.', this.errorTitle);
      return;
    }

    this.releasePreview();
    this.selectedFile = file;
    this.previewUrl = URL.createObjectURL(file);
  }

  /** Descarta el archivo elegido y vuelve a mostrar el logo guardado. */
  clearSelectedLogo(): void {
    this.releasePreview();
    this.selectedFile = null;
    const input = document.getElementById('logoInput') as HTMLInputElement | null;
    if (input) input.value = '';
  }

  /** Libera la URL temporal; si no, el blob se queda en memoria. */
  private releasePreview(): void {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = null;
    }
  }

  ngOnDestroy(): void {
    this.releasePreview();
  }

  updateCompany() {
    // Los desplegables de catalogo viven fuera del FormGroup: hay que volcarlos
    // antes de validar y enviar, o se guardarian vacios.
    this.volcarCatalogos();
    if (this.companyForm.valid) {
      this.spinner.show();
      const formData = this.buildFormData();

      this.companyService.updateCompanyByUser(formData).subscribe(
        (response: any) => {
          // Se suelta la vista previa local para que pase a verse la imagen ya
          // subida; si se dejara, seguiriamos mirando el blob y no sabriamos si
          // el upload funciono de verdad.
          this.clearSelectedLogo();
          this.ngOnInit();
          this.spinner.hide();
          this.showModal(false, this.successMessage, this.successTitle);
        },
        (error: any) => {
          this.spinner.hide();     
          this.showModal(true, this.updateErrorMessage, this.errorTitle);
        }
      );
    } else {
      this.showModal(true, this.formInvalidMessage, this.formErrorTitle);
    }
  }

  private buildFormData(): FormData {
    const formData = new FormData();
    formData.append('Email', this.companyForm.get('email')?.value);
    formData.append('CompanyName', this.companyForm.get('companyName')?.value);
    formData.append('Address', this.companyForm.get('address')?.value);
    formData.append('CompanyId', this.companyForm.get('companyId')?.value);
    formData.append('Document', this.companyForm.get('document')?.value);
    formData.append('Telephones', this.companyForm.get('telephones')?.value);
    formData.append('UrlWeb', this.companyForm.get('urlWeb')?.value);

    // Datos fiscales (DIAN). Todos opcionales: se manda cadena vacia si no hay nada,
    // que es lo que el backend guarda como "sin especificar".
    for (const field of [
      'personType', 'documentType', 'verificationDigit', 'registrationName',
      'taxLevelCode', 'taxSchemeId', 'economicActivityCode', 'economicActivityName',
      'commercialRegistration', 'cityCode', 'cityName', 'departmentCode',
      'departmentName', 'postalZone', 'countryCode',
    ]) {
      const pascal = field.charAt(0).toUpperCase() + field.slice(1);
      formData.append(pascal, this.companyForm.get(field)?.value ?? '');
    }

    if (this.selectedFile) {
      formData.append('FileLogo', this.selectedFile);
    }

    return formData;
  }

  private handleError(consoleMessage: string, modalMessage: string) {
    console.error(consoleMessage);
    this.showModal(true, modalMessage, this.errorTitle);
  }

  showModal(isError: boolean, message: string, title: string = this.errorTitle) {
    this.confirmationModal.isModalError = isError;
    this.confirmationModal.title = title;
    this.confirmationModal.messageModal = message;
    this.confirmationModal.openModal();
  }
}
