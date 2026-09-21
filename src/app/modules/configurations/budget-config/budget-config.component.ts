import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BudgetConfigurationService } from '../services/budgetConfiguration.service';
import { BudgetTemplateService } from '../services/budgetTemplate.service';
import { BudgetTemplate } from '../models/budgetTemplate.Model';
import { NgxSpinnerService } from 'ngx-spinner';
import { ConfirmationModalComponent } from 'src/app/shared/components/reusable-modal/reusable-modal.component';
import {
  DocumentTemplateConfiguration,
  DocumentTemplateConfigurationService,
  DocumentType,
} from '../services/documentTemplateConfiguration.service';

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

  // ---------- Apariencia del documento ----------

  /**
   * Tipo de documento que se esta configurando. Cada uno guarda su propia
   * apariencia: una empresa puede querer la cotizacion con su color y la factura
   * sobria.
   */
  docType: DocumentType = 'Budget';

  readonly docTypes: { value: DocumentType; label: string }[] = [
    { value: 'Budget', label: 'Cotizaciones' },
    { value: 'Invoice', label: 'Facturas' },
  ];

  docConfig: DocumentTemplateConfiguration | null = null;
  savingDocConfig = false;

  /** Tamanos de texto que el generador sabe aplicar. */
  readonly fontSizes = [9, 10, 11, 12, 13, 14];

  setDocType(type: DocumentType): void {
    if (this.docType === type) return;
    this.docType = type;
    this.loadDocConfig();
  }

  private loadDocConfig(): void {
    this.docConfigService.get(this.docType).subscribe({
      next: cfg => { this.docConfig = cfg; },
      error: () => { this.handleError('Error al cargar la apariencia del documento', this.loadConfigError); }
    });
  }

  /**
   * Guarda la apariencia. Ya no tiene boton propio: lo llama el unico Guardar
   * de la pantalla.
   *
   * Antes habia DOS botones de guardar en el mismo formulario, y el que uno se
   * encontraba primero al bajar -"Guardar apariencia"- no guardaba la plantilla
   * recien elegida, pero respondia "guardado correctamente". El usuario elegia
   * plantilla, guardaba, veia el mensaje de exito, refrescaba y seguia la
   * anterior. Reproducido en el navegador: pulsando el de abajo guarda; pulsando
   * el de arriba no, y avisa de que si.
   */
  private saveDocConfigSilently(): Promise<void> {
    if (!this.docConfig) return Promise.resolve();

    return new Promise((resolve, reject) => {
      this.docConfigService.save(this.docConfig!).subscribe({
        next: cfg => { this.docConfig = cfg; resolve(); },
        error: (err: any) => reject(err),
      });
    });
  }

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
    private docConfigService: DocumentTemplateConfigurationService,
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
    this.loadDocConfig();
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
        // Las dos cosas en el mismo guardado: la plantilla y la apariencia. Que
        // fueran dos botones es lo que hacia creer que se habia guardado algo
        // que no.
        await this.budgetConfigService.updateBudgetConfigByUser(this.companyForm.value).toPromise();
        await this.saveDocConfigSilently();
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
    this.confirmationModal.isModalError = isError;
    this.confirmationModal.title = title;
    this.confirmationModal.messageModal = message;
    this.confirmationModal.openModal();
  }

  selectOption(option: number) {
    this.selectedOption = option;
    this.companyForm.patchValue({
      budgetTemplateId: option
    });
  }
}
