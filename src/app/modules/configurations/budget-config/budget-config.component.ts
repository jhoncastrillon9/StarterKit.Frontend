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
  styleUrls: ['./budget-config.component.scss']
})
export class BudgetConfigComponent implements OnInit {
  @ViewChild('confirmationModal') confirmationModal!: ConfirmationModalComponent;
  isModalError: boolean = false;

  companyForm: FormGroup;
  companyId?: string = '0';
  selectedFile: File | null = null;
  urlImageLogo: string = '';
  selectedOption: number = 0;
  budgetTemplates: BudgetTemplate[] = [];

  // Variables para textos reutilizados
  private readonly successMessage: string = "¡Los formatos de tus cotizaciones han sido actualizados correctamente!";
  private readonly successTitle: string = "¡Actualización Completada!";
  private readonly errorTitle: string = "Oops, ocurrió un error.";
  private readonly loadConfigError: string = "Algo falló al obtener la configuración, refresca la página F5.";
  private readonly loadTemplatesError: string = "Algo falló al obtener las plantillas, refresca la página F5.";
  private readonly updateError: string = "Algo falló al actualizar la info de tu empresa. Intenta de nuevo, que a la segunda va la vencida.";
  private readonly formInvalidMessage: string = "El formulario necesita un poco más de amor. Completa los campos correctamente y listo. 🚀";
  title: string = this.successTitle;
  messageModal: string = this.successMessage;

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


  async ngOnInit() {
    try {
      this.spinner.show();
      const budgetConfig = await this.budgetConfigService.getBudgetConfigByCompanyId().toPromise();
      if (budgetConfig) {
        this.companyForm.patchValue(budgetConfig);
        this.selectedOption = budgetConfig.budgetTemplateId || 0;
      }
    } catch (error) {
      this.handleError('Error al consultar empresa', this.loadConfigError);
    } finally {
      this.spinner.hide();
    }

    this.loadTemplates();
  }

  async loadTemplates() {
    try {
      this.spinner.show();
      this.budgetTemplates = await this.budgetTemplateService.getbudgetTemplates().toPromise();
    } catch (error) {
      this.handleError('Error al cargar templates', this.loadTemplatesError);
    } finally {
      this.spinner.hide();
    }
  }

  async updateBudgetConfig() {
    if (this.companyForm.valid) {
      try {
        this.spinner.show();
        await this.budgetConfigService.updateBudgetConfigByUser(this.companyForm.value).toPromise();
        await this.ngOnInit();  // Refresca la información
        this.showModal(false, this.successMessage, this.successTitle);
      } catch (error) {
        this.showModal(true, this.updateError);
      } finally {
        this.spinner.hide();
      }
    } else {
      this.showModal(true, this.formInvalidMessage);
    }
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

  selectOption(option: number) {
    this.selectedOption = option;
    this.companyForm.patchValue({
      budgetTemplateId: option
    });
  }
}
