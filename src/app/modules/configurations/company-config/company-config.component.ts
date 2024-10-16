import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CompanyService } from '../services/company.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { ConfirmationModalComponent } from 'src/app/shared/components/reusable-modal/reusable-modal.component';

@Component({
  selector: 'app-company-config',
  templateUrl: './company-config.component.html',
  styleUrls: ['./company-config.component.scss']
})
export class CompanyConfigComponent implements OnInit {
  @ViewChild('confirmationModal') confirmationModal!: ConfirmationModalComponent;
  isModalError: boolean = false;

  companyForm: FormGroup;
  companyId?: string = '0';  
  selectedFile: File | null = null;
  urlImageLogo: string = '';

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
      urlWeb: ['']
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
            urlWeb: company.urlWeb || ''
          });
          this.urlImageLogo = company.urlImageLogo || '';
        }
        this.spinner.hide();
      },
      (error: any) => {
        this.handleError('Error al consultar empresa', this.loadDataError);
        this.spinner.hide();
      }
    );
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      this.selectedFile = file;
    } else {
      this.showModal(true, 'Solo puedes cargar archivos de tipo imagenes 😉', this.errorTitle);
    }
  }

  updateCompany() {
    if (this.companyForm.valid) {
      this.spinner.show();
      const formData = this.buildFormData();

      this.companyService.updateCompanyByUser(formData).subscribe(
        (response: any) => {
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
    this.isModalError = isError;
    this.title = title;
    this.messageModal = message;
    this.confirmationModal.openModal();
  }
}
