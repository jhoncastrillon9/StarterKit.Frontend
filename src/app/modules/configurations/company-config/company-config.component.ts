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
  companyForm: FormGroup = new FormGroup({});
  companyId?: string = '0';
  messageModal: string = "Información de la empresa actualizada.";
  public visible = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private companyService: CompanyService,
    private spinner: NgxSpinnerService
  ) {

  }

  ngOnInit() {

    this.companyForm = this.fb.group({
      email: ['', [Validators.email, Validators.required]],
      companyName: ['', [Validators.required]],
      address: [''],
      companyId: [''],
      document: [''],
      telephones: [''],
      urlImageLogo: [''],
    });

    this.spinner.show();
    this.companyService.getCompanyByUser().subscribe((company: any) => {
      console.log(company);
      this.companyForm.patchValue(company);
      this.spinner.hide();
    },
    (error: any) => {
      // Maneja errores y muestra un mensaje al usuario
      console.error('Error al consultar empresa', error);
      this.spinner.hide();
      // Puedes mostrar una alerta aquí
    });

  }


 updateCompany() {
 
    if (this.companyForm.valid) {
      this.spinner.show();
      const formData = this.companyForm.value;  
        this.companyService.updateCompanyByUser(formData).subscribe(
          (response: any) => {
            console.log("Company is OK");          
            this.router.navigate(['/configurations']);
            this.spinner.hide();
            this.messageModal = "Información de la empresa actualizada.";
            this.ClosedOpenModal();
          },
          (error: any) => {            
            console.error('Error al actualizar empresa', error);
            this.spinner.hide();
            this.messageModal = "Hubo un error al actualizar la información de la empresa.";
            this.ClosedOpenModal();
          }
        );

    } else {

      console.log('El formulario no es válido. Por favor, complete los campos correctamente.');
    }
  }


    
  ClosedOpenModal() {
    console.log("visibles antes: " + this.visible);
    this.visible = !this.visible;
    console.log("visibles despues : " + this.visible);

  }

  handleLiveDemoChange(event: any) {
    this.visible = event;
  }



}


