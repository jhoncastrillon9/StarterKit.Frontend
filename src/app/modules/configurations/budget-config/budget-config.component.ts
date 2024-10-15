import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BudgetConfigurationService } from '../services/budgetConfiguration.service';
import { BudgetTemplateService } from '../services/budgetTemplate.service';
import { BudgetTemplate } from '../models/budgetTemplate.Model';
import { NgxSpinnerService } from 'ngx-spinner';
import { ConfirmationModalComponent } from 'src/app/shared/components/reusable-modal/reusable-modal.component';

@Component({
  selector: 'app-budget-config',
  templateUrl: './budget-config.component.html',
  styleUrl: './budget-config.component.scss'
})
export class BudgetConfigComponent implements OnInit {
  @ViewChild('confirmationModal') confirmationModal!: ConfirmationModalComponent;
  companyForm: FormGroup;
  companyId?: string = '0';
  messageModal: string = "¡Los formatos de tus cotizaciones han sido actualizados correctamente!";
  title: string = "¡Actualización Completada!";
  isModalError: boolean = false;
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
        this.isModalError = true;
        this.title = "Oops, ocurrió un error.";
        this.messageModal = "Algo falló al obtener la configuración, refresca la pagina F5.";
        this.showModal();
      }
    );

    this.loadTemplates();

  }

  loadTemplates() {
    this.spinner.show();
    this.budgetTemplateService.getbudgetTemplates().subscribe(templates => {
      this.budgetTemplates = templates;
      this.spinner.hide();
    }, (error) => {
      console.error('Error al cargar templates', error);
      this.spinner.hide();
      this.isModalError = true;
      this.title = "Oops, ocurrió un error.";
      this.messageModal = "Algo falló al obtener las plantillas, refresca la pagina F5.";
      this.showModal();
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
          this.isModalError = false;
          this.messageModal = "¡Los formatos de tus cotizaciones han sido actualizados correctamente!";
          this.title = "¡Actualización Completada!";
          this.showModal();
        },
        (error: any) => {
          this.spinner.hide();
          this.isModalError = true;
          this.title = "Oops, ocurrió un error.";
          this.messageModal = "Algo falló al actualizar la info de tu empresa. Intenta de nuevo, que a la segunda va la vencida.";
          this.showModal();
        }
      );
    } else {
      this.isModalError = true;
      this.title = "Oops, ocurrió un error.";
      this.messageModal = "El formulario necesita un poco más de amor. Completa los campos correctamente y listo. 🚀";
      this.showModal();
    }
  }

  showModal() {
    this.confirmationModal.openModal();
  }

  selectOption(option: number) {
    this.selectedOption = option;

    this.companyForm.patchValue({
      budgetTemplateId: option
    });

  }


}
