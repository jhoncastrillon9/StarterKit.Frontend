import { Component, OnInit, ViewChild } from '@angular/core';
import { cilEnvelopeOpen, flagSet } from '@coreui/icons';
import { IconModule, IconSetService } from '@coreui/icons-angular';
import { cilPencil, cilXCircle, cilZoom, cilCloudDownload, cilNoteAdd, cilMoney} from '@coreui/icons';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Table, TableModule} from 'primeng/table';
import { ViewEncapsulation } from '@angular/core';
import { SharedModule } from '../../../shared.module';
import { CommonModule } from '@angular/common';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { ButtonGroupModule, ButtonModule, CardModule, DropdownModule, FormModule, GridModule, ListGroupModule, ModalModule } from '@coreui/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ConfirmationModalComponent } from '../../../shared/components/reusable-modal/reusable-modal.component';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CustomerModel } from '../../customers/models/customer.Model';
import { ProjectReportModel } from '../models/projectReport.Model';
import { CustomerService } from '../../customers/services/customer.service';
import { ProjectReportDetailModel } from '../models/projectReportDetail.Model';
import { ProjectReportService } from '../services/projectReportService.service';
import { CustomSharedModule} from '../../../shared/shared.module';
import { InputTextModule } from 'primeng/inputtext';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { StyleClassModule } from 'primeng/styleclass';
import { InputMaskModule } from 'primeng/inputmask';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputOtpModule } from 'primeng/inputotp';
import { ButtonModule as PrimeButtonModule }  from 'primeng/button';
import { SendProjectReportPdfRequest } from '../models/SendProjectReportPdfRequest';
import { BudgetModel } from '../../budgets/models/budget.Model';

@Component({
  selector: 'app-add-update-project-report',
  standalone: true,
    imports: [    SharedModule,     CommonModule,         RouterModule,     NgxSpinnerModule,         CardModule,     FormModule,     GridModule,     FormsModule,     ButtonModule,     ReactiveFormsModule,     FormModule,
       PrimeButtonModule,     DropdownModule,    SharedModule,    ListGroupModule,    IconModule,    ModalModule,    TableModule,    InputTextModule,    InputIconModule,    IconFieldModule,    StyleClassModule,    InputMaskModule,
      InputSwitchModule,    InputNumberModule,    InputTextareaModule,    InputGroupAddonModule,    InputGroupModule,    InputOtpModule, CustomSharedModule
      ],
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
  budgets: BudgetModel[] = [];

  searchTerm = '';
  selectedItems: ProjectReportModel[] = [];
  apuModels: ProjectReportModel[] = [];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private projectReportService: ProjectReportService,
    private customerService: CustomerService,
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

  removeProjectReportDetail(index: number) {
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


  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      //this.selectedFile = file;
    } else {
      this.showModalDefault(true, 'Solo puedes cargar archivos de tipo imagenes 😉', this.errorTitle);
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