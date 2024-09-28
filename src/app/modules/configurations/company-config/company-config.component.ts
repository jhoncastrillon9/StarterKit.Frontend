import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CompanyService } from '../services/company.service';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-company-config',
  templateUrl: './company-config.component.html',
  styleUrls: ['./company-config.component.scss']
})
export class CompanyConfigComponent implements OnInit {
  companyForm: FormGroup;
  companyId?: string = '0';
  messageModal: string = "¡Los datos de tu empresa han sido actualizados con éxito!";
  visible = false;
  selectedFile: File | null = null;
  urlImageLogo: string = '';

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
        console.error('Error al consultar empresa', error);
        this.spinner.hide();
      }
    );
  }

  onFileSelected(event: any) {
    if (event.target.files.length > 0) {
      const file = event.target.files[0];
      if (file.type.startsWith('image/')) {
        this.selectedFile = file;
      } else {
        alert('Solo se pueden cargar imágenes.');
      }
    }
  }

  updateCompany() {
    if (this.companyForm.valid) {
      this.spinner.show();
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

      this.companyService.updateCompanyByUser(formData).subscribe(
        (response: any) => {
          this.ngOnInit();
          this.spinner.hide();
          this.messageModal = "Información de la empresa actualizada.";
          this.showModal();
        },
        (error: any) => {
          console.error('Error al actualizar empresa', error);
          this.spinner.hide();
          this.messageModal = "Hubo un error al actualizar la información de la empresa.";
          this.showModal();
        }
      );
    } else {
      console.log('El formulario no es válido. Por favor, complete los campos correctamente.');
    }
  }

  showModal() {
    this.visible = true;
  }

  closeModal() {
    this.visible = false;
  }

  handleLiveDemoChange(event: any) {
    this.visible = event;
  }
}
