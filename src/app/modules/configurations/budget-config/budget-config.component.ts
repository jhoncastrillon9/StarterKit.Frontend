import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BudgetConfigurationService } from '../services/budgetConfiguration.service';
import { BudgetTemplateService } from '../services/budgetTemplate.service';
import { BudgetTemplate } from '../models/budgetTemplate.Model';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-budget-config',
  templateUrl: './budget-config.component.html',
  styleUrl: './budget-config.component.scss'
})
export class BudgetConfigComponent implements OnInit{
  
  companyForm: FormGroup;
  companyId?: string = '0';
  messageModal: string = "¡Los formatos de tus cotizaciones han sido actualizados correctamente!";
  visible = false;
  selectedFile: File | null = null;
  urlImageLogo: string = '';
  selectedOption: number = 0;  
  budgetTemplates: BudgetTemplate[] = [];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private budgetConfigService: BudgetConfigurationService,
    private budgetTemplateService: BudgetTemplateService,
    private spinner: NgxSpinnerService
  ) {
    this.companyForm = this.fb.group({
      budgetConfigId: [''],
      companyId: [''],
      templateId: [''],
      budgetTemplateId: [''],
      primaryColor: [''],
      secondaryColor: [''],
      introduction: [''],
      urlImageExample: ['']
    });
  }


  ngOnInit() {
    this.spinner.show();
    this.budgetConfigService.getBudgetConfigByCompanyId().subscribe(
      (budgetConfig: any) => {
        if (budgetConfig) {
          this.companyForm.patchValue(budgetConfig);
          this.selectedOption = budgetConfig.budgetTemplateId ? budgetConfig.budgetTemplateId : 0;  

        }
        this.spinner.hide();
      },
      (error: any) => {
        console.error('Error al consultar empresa', error);
        this.spinner.hide();
      }
    );

    this.loadTemplates();

  }

  loadTemplates() {
    this.spinner.show();
    this.budgetTemplateService.getbudgetTemplates().subscribe(templates => {
      this.budgetTemplates = templates;
      this.spinner.hide();
    },(error)=>{
      console.error('Error al cargar templates', error);
      this.spinner.hide();
    });
  }

  
  updateBudgetConfig() {
    if (this.companyForm.valid) {
      this.spinner.show();
      const formData = this.companyForm.value;  
      this.budgetConfigService.updateBudgetConfigByUser(formData).subscribe(
        (response: any) => {
          this.ngOnInit();
          this.spinner.hide();
          this.messageModal = "¡Los formatos de tus cotizaciones han sido actualizados correctamente!";
          this.showModal();
        },
        (error: any) => {
          console.error('Error al actualizar empresa', error);
          this.spinner.hide();
          this.messageModal = "Oops, algo salió mal al intentar actualizar la información de tu empresa. Por favor, inténtalo de nuevo.";
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



  selectOption(option: number) {
    this.selectedOption = option;

    this.companyForm.patchValue({
      budgetTemplateId: option
    });

  }

}
