import { Component, ViewChild } from '@angular/core';
import { ConfirmationModalComponent } from '../../../shared/components/reusable-modal/reusable-modal.component';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CustomerModel } from '../../customers/models/customer.Model';
import { ProjectReportModel } from '../models/projectReport.Model';
import { Router, ActivatedRoute } from '@angular/router';
import { cilPencil, cilXCircle, cilMoney } from '@coreui/icons';
import { IconSetService } from '@coreui/icons-angular';
import { NgxSpinnerService } from 'ngx-spinner';
import { ApuService } from '../../apus/services/apu.service';
import { CustomerService } from '../../customers/services/customer.service';
import { ProjectReportDetailModel } from '../models/projectReportDetail.Model';
import { ProjectReportService } from '../services/projectReportService.service';

@Component({
  selector: 'app-add-update-project-report',
  standalone: true,
  imports: [],
  templateUrl: './add-update-project-report.component.html',
  styleUrl: './add-update-project-report.component.scss'
})

export class AddUpdateProjectReportComponent {
  @ViewChild('confirmationModal') confirmationModal!: ConfirmationModalComponent;
  isModalError: boolean = false;
  private readonly errorTitle: string = "¡Ups! ocurrió un error.";
  title: string = '';
  messageModal: string = "¡Actualizados correctamente!";
  private readonly errorGeneralMessage: string = "Algo salió mal. Por favor, intenta de nuevo más tarde. Si el problema persiste, no dudes en contactar con el soporte técnico o intenta refrescar la pagina";
  projectReportForm: FormGroup;
  projectReporId?: string;
  currentDate: Date = new Date();
  customers: CustomerModel[] = [];
  showErrors: boolean = false;
  msjError: string = "";
  titlePage: string = "Nuevo Informe de Obra";
  visible = false;


  searchTerm = '';
  selectedItems: ProjectReportModel[] = [];
  apuModels: ProjectReportModel[] = [];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private projectReportService: ProjectReportService,
    private customerService: CustomerService,
    private apuService: ApuService,
    public iconSet: IconSetService,
    private spinner: NgxSpinnerService
  ) {
    this.projectReportForm = this.fb.group({
      projectReportId: ['0'],
      customerId: ['0'],
      internalCode: ['0'],
      budgetId: ['0'],
      budgetInternalCode: ['0'],
      projectReportName: [''],
      note: [''],
      date: [new Date()], 
      projectReportDetailsDto: this.fb.array([]) // Inicializa el FormArray para los detalles del presupuesto
    });

    iconSet.icons = { cilPencil, cilXCircle, cilMoney };

  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.projectReporId = params.get('id')!;
      this.spinner.show();
      if (this.projectReporId) {
        this.titlePage = "Editar Informe de obra";
        this.projectReportService.getById(this.projectReporId).subscribe((projectReport: any) => {

          this.projectReportForm.patchValue(projectReport);

          // Agrega el código aquí para cargar los detalles del presupuesto
          if (projectReport && projectReport.budgetDetailsDto) {
            const detailsArray = this.projectReportForm.get('projectReportDetailsDto') as FormArray;
            detailsArray.clear(); // Limpia los detalles existentes si los hubiera
       
            projectReport.budgetDetailsDto.forEach((detail: any) => {
              const projectReportDetailsGroup = this.fb.group({
                projectReporDetailtId: detail.projectReporDetailtId,
                projectReporId: detail.projectReporId,
                description: detail.description,
                urlImage: detail.urlImage         
              });
              detailsArray.push(projectReportDetailsGroup);
            });

            this.spinner.hide();
          }
        }, (error) => {
          this.spinner.hide();
          this.handleError('Load Data', this.errorGeneralMessage);
        });
      } else {
        //Add empty row 
        this.addProjectReportDetail();
      }
    });

    this.loadCustomers();
  }

  loadCustomers() {
    this.spinner.show();
    this.customerService.get().subscribe(customers => {
      this.customers = customers;
      this.spinner.hide();
    }, (error) => {
      console.error('Error al cargar Budget', error);
      this.spinner.hide();
      this.handleError('Load Data', this.errorGeneralMessage);
    });
  }


  addProjectReportDetail() {
    const reportDetailsGroup = this.fb.group({
      projectReporDetailtId: [0],
      projectReporId: [0],
      urlImage: ['',[Validators.required]],
      description: ['', [Validators.required]],     
    });
    this.projectReportDetailsArray.push(reportDetailsGroup);
  }

  removeBudgetDetail(index: number) {
    this.projectReportDetailsArray.removeAt(index);
  }

  get projectReportDetailsArray() {
    return this.projectReportForm.get('projectReportDetailsDto') as FormArray;
  }

  onAddUpdateProjectReport() {
    this.projectReportForm.markAllAsTouched();
    if (this.projectReportForm.valid) {
      this.spinner.show();
      this.projectReportForm.get('date')?.setValue(this.currentDate);
      const formData = this.projectReportForm.value;
      if (this.projectReporId) {
        this.projectReportService.update(formData).subscribe(
          (response: any) => {
            this.router.navigate(['/projectreports/projectreports']);
            this.spinner.hide();
          },
          (error) => {
            this.showErrors = true;
            this.msjError = error;
            this.spinner.hide();
            this.handleError('Load Data', this.errorGeneralMessage);
          }
        );
      } else {
        this.projectReportService.add(formData).subscribe(
          (response: any) => {
            this.router.navigate(['/projectreports/projectreports']);
            this.spinner.hide();
          },
          (error) => {
            this.showErrors = true;
            this.msjError = "Error inesperado, revisa la información del formulario";
            this.spinner.hide();
            this.handleError('Load Data', this.errorGeneralMessage);
          }
        );
      }
    } else {
      this.showErrors = true;
      this.showModalDefault(true, 'Por favor, completa todos los campos requeridos o verifica que no haya filas vacías antes de continuar.', '¡Campos incompletos!');
    }
  }







  
  handleLiveDemoChange(event: any) {
    this.visible = event;
  }

  showModal() {
    this.visible = true;
  }

  closeModal() {
    this.visible = false;
  }







  private handleError(consoleMessage: string, modalMessage: string) {
    console.error(consoleMessage);
    this.showModalDefault(true, modalMessage, this.errorTitle);
  }

  showModalDefault(isError: boolean, message: string, title: string) {
    this.confirmationModal.isModalError = isError;
    this.confirmationModal.title = title;
    this.confirmationModal.messageModal = message;
    this.confirmationModal.isConfirmation = false; // Aseguramos que no esté en modo confirmación
    this.confirmationModal.openModal();
  }
  showNotify() {
    console.log('show notify');
  }
}