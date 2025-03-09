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
import { AbstractControl, FormsModule, ReactiveFormsModule, ValidationErrors, ValidatorFn } from '@angular/forms';
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
import { BudgetDetailModel, BudgetModel } from '../../budgets/models/budget.Model';
import { BudgetService } from '../../budgets/services/budget.service';

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
  title: string = '';
  projectReportForm: FormGroup;
  projectReporId?: string;
  currentDate: Date = new Date();
  customers: CustomerModel[] = [];
  showErrors: boolean = false;
  msjError: string = "";
  visible = false;
  budgets: BudgetModel[] = [];
  projectReportToSendEmail: ProjectReportModel = new ProjectReportModel;
  selectBudgetDetailsModel : BudgetDetailModel[] = [];
  private readonly sendEmailTitleComfirmation: string = "Informe de Obra en camino! 📬";
  private readonly errorToSendEmailMessage: string = "Algo salió mal al enviar el email. Por favor, intenta de nuevo más tarde. Si el problema persiste, no dudes en contactar con el soporte técnico o intenta refrescar la pagina";
  private readonly errorToDownloadBudgetMessage: string = "Algo salió mal al descargar el informe de obra. Por favor, intenta de nuevo más tarde. Si el problema persiste, no dudes en contactar con el soporte técnico o intenta refrescar la pagina";
  private readonly successDeleteMessage: string = "¡El Informe de Obra ha sido eliminada correctamente!";
  private readonly successSendProjectReportMessage: string = "¡Todo listo! Tu correo ha volado hacia sus destinatarios. Si no lo ves pronto, échale un ojo a la carpeta de spam... 😉";
  private readonly successSendProjectReportTitle: string = "¡Correo Enviado!";
  private readonly errorTitle: string = "¡Ups! ocurrió un error.";
  private readonly errorGeneralMessage: string = "Algo salió mal. Por favor, intenta de nuevo más tarde. Si el problema persiste, no dudes en contactar con el soporte técnico o intenta refrescar la pagina";
  messageModal: string = "¡Actualizados correctamente!";
  titlePage: string = "Nuevo Informe de Obra";


  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private projectReportService: ProjectReportService,
    private customerService: CustomerService,
    private budgetService: BudgetService,
   public iconSet: IconSetService,
    private spinner: NgxSpinnerService
  ) {
    this.projectReportForm = this.fb.group({
      projectReportId: ['0'],
      customerId: ['0'],
      internalCode: ['0'],
      budgetId: ['0', [Validators.required, this.budgetIdValidator]],
      budgetInternalCode: ['0'],
      projectReportName: ['', Validators.required],
      note: [''],
      signature: [''],
      introdution: ['Nos complace informarle que hemos finalizado el proyecto que hemos llevado a cabo para ustedes. Adjuntamos evidencia fotográfica que refleja el trabajo realizado, con la confianza de que podrá apreciar el esfuerzo y la dedicación invertidos en el desarrollo de este proyecto. Agradecemos su confianza y esperamos seguir colaborando en futuros proyectos.'],
      date: [new Date()], 
      projectReportDetailsDto: this.fb.array([], this.minLengthArray(1))
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
          if (projectReport && projectReport.projectReportDetailsDto) {
            const detailsArray = this.projectReportForm.get('projectReportDetailsDto') as FormArray;
            detailsArray.clear(); // Limpia los detalles existentes si los hubiera
       
            projectReport.projectReportDetailsDto.forEach((detail: any) => {
              const projectReportDetailsGroup = this.fb.group({
                projectReporDetailtId: detail.projectReporDetailtId,
                projectReporId: detail.projectReporId,
                description: detail.detailSelect + detail.description,
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
        //this.addProjectReportDetail();
      }
    });

    this.loadCustomers();
    this.loadBudgets();
  }

  budgetIdValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (value <= 0) {
      return { invalidBudgetId: 'Budget ID must be greater than 0' };
    }
    return null;
  }

  minLengthArray(min: number) {
    return (control: AbstractControl) => {
      if (control instanceof FormArray && control.length < min) {
        return { minLengthArray: true };
      } 
      return null;
    };
  }

  loadBudgets(){
    this.spinner.show()    
    this.budgetService.getWithDetail().subscribe(budgetsModel => {
      this.budgets = budgetsModel;
      this.spinner.hide();
    },(error)=>{
      this.spinner.hide();
      this.handleError('Error to Load Bugets', this.errorGeneralMessage);
    });
  }

  loadCustomers() {
    this.spinner.show();
    this.customerService.get().subscribe(customers => {
      this.customers = customers;
      this.spinner.hide();
    }, (error) => {
      console.error('Error al cargar Budget', error);
      this.spinner.hide();
      this.handleError('Erro trying Load Customers', this.errorGeneralMessage);
    });
  }


  addProjectReportDetail() {
    const reportDetailsGroup = this.fb.group({
      projectReporDetailtId: [0],
      projectReporId: [0],
      urlImage: [''],
      ImageFile: [''],
      imageFileXX: [''],
      description: [''],  
      detailSelect: ['']   
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

      const formData = new FormData();
      formData.append('projectReportId', this.projectReportForm.get('projectReportId')?.value??0);
      formData.append('customerId', this.projectReportForm.get('customerId')?.value??0);
      formData.append('internalCode', this.projectReportForm.get('internalCode')?.value??0);
      formData.append('budgetId', this.projectReportForm.get('budgetId')?.value?? 0);
      formData.append('budgetInternalCode', this.projectReportForm.get('budgetInternalCode')?.value?? 0);
      formData.append('companyId', this.projectReportForm.get('companyId')?.value?? 0);

      formData.append('projectReportName', this.projectReportForm.get('projectReportName')?.value?? '');
      formData.append('note', this.projectReportForm.get('note')?.value ?? '');
      
      
      formData.append('introdution', this.projectReportForm.get('introdution')?.value?? '');
      formData.append('signature', this.projectReportForm.get('signature')?.value?? '');
      formData.append('date', this.projectReportForm.get('date')?.value.toISOString());

      // Agregar detalles del proyecto
      const detailsArray = this.projectReportForm.get('projectReportDetailsDto') as FormArray;
      detailsArray.controls.forEach((control: any, index: number) => {
        formData.append(`projectReportDetailsDto[${index}].projectReporDetailtId`, control.get('projectReporDetailtId').value??0);
        formData.append(`projectReportDetailsDto[${index}].projectReportId`, this.projectReportForm.get('projectReportId')?.value??0);

        formData.append(`projectReportDetailsDto[${index}].description`, control.get('description').value??'' );  
        formData.append(`projectReportDetailsDto[${index}].title`, control.get('detailSelect').value.description??'' );
        formData.append(`projectReportDetailsDto[${index}].budgetDetailId`, control.get('detailSelect').value.budgetDetailId??0 );     


        if (control.get('imageFile').value) {
          formData.append(`projectReportDetailsDto[${index}].imageFile`, control.get('imageFileXX').value);
        }
      });

      if (this.projectReporId) {
        this.projectReportService.update(formData).subscribe(
          (response: any) => {
            this.router.navigate(['/projectreports/projectreports']);
            this.spinner.hide();
          },
          (error) => {
            this.spinner.hide();
            this.handleError('Error to update Project Report', this.errorGeneralMessage);
          }
        );
      } else {
        this.projectReportService.add(formData).subscribe(
          (response: any) => {
            this.router.navigate(['/projectreports/projectreports']);
            this.spinner.hide();
          },
          (error) => {
            this.spinner.hide();
            this.handleError('Error to add Project Report', this.errorGeneralMessage);
          }
        );
      }
    } else {
      const errors = this.projectReportForm.get('projectReportDetailsDto')?.errors;

      if (errors?.['minLengthArray']) {
        this.showModalDefault(true, 'Por favor, agrega por lo menos una imagen al informe.', '¡Imagenes por subir!');
      }else
      {
        this.showModalDefault(true, 'Por favor, completa todos los campos requeridos o verifica que no haya filas vacías antes de continuar.', '¡Campos incompletos!');
      }
    }
  }


  onFileSelected(event: any) {
    const files = event.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {  
        const file = files[i];
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e: any) => {
            const imageFile = e.target.result;
            const reportDetailsGroup = this.fb.group({
              projectReporDetailtId: [0],
              projectReporId: [0],
              urlImage: [''],
              description: [''],
              detailSelect: [''],
              imageFile: [imageFile],
              imageFileXX: [file]
            });
            this.projectReportDetailsArray.push(reportDetailsGroup);
          };
          reader.readAsDataURL(file);
        } else {
          this.showModalDefault(true, 'Solo puedes cargar archivos de tipo imagenes 😉', this.errorTitle);
        }
      }
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



  onBudgetChange(event: any) {
    const selectedBudgetId = event.target.value;
    const selectedBudget = this.budgets.find(budget => budget.budgetId == selectedBudgetId);



    if (selectedBudget) {
      
      console.log(selectedBudget.companyDTO);
      this.selectBudgetDetailsModel = selectedBudget.budgetDetailsDto;
      this.projectReportForm.patchValue({
        projectReportName: `${selectedBudget.internalCode} - ${selectedBudget.budgetName}`,
        customerId: selectedBudget.customerId,
        budgetInternalCode: selectedBudget.internalCode,
        budgetId: selectedBudget.budgetId,
        companyId: selectedBudget.companyId,
        signature: `${selectedBudget.companyDTO.companyName}\n NIT: ${selectedBudget.companyDTO.document}` 
      });
    }
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



  sendEmailProjectReportWithComfirm(projectReportModelModel: ProjectReportModel){ 
      this.projectReportToSendEmail = projectReportModelModel;
      this.confirmationModal.messageModal = "Tu Informe de obra se enviará a los siguientes correos electrónicos: "+ projectReportModelModel.customerDto.email;
      this.confirmationModal.title = this.sendEmailTitleComfirmation;
      this.confirmationModal.isConfirmation = true; 
      this.confirmationModal.titleButtonComfimationYes = 'Si, Enviar';
      // Emitimos la acción a ejecutar cuando se confirme
      this.confirmationModal.confirmAction.subscribe(() => this.sendEmailProjectReport()); 
      this.confirmationModal.openModal(); 
  
    }
  
     sendEmailProjectReport(){      
      this.spinner.show()   
        var request = new SendProjectReportPdfRequest(this.projectReportToSendEmail);
        this.budgetService.sendEmailBudget(request).subscribe(
          (response: any) => {              
            this.loadBudgets();           
            this.spinner.hide();
            this.showModalDefault(false,this.successSendProjectReportMessage,this.successSendProjectReportTitle,)
          },
          (error) => {
            this.spinner.hide();
            this.handleError('Error to send Bugets', this.errorToSendEmailMessage);
          }
        );     
        this.projectReportToSendEmail = new ProjectReportModel;;
    }
  
 
    downloadProjectReport(projectReportModel: ProjectReportModel) {
      this.spinner.show();
      this.budgetService.download(projectReportModel.budgetId).subscribe(
        (data: Blob) => {
          this.descargarPDF(data,projectReportModel);
          this.spinner.hide();
        },
        (error) => {
          this.spinner.hide(); 
          this.handleError('Error to download Prject Report', this.errorToDownloadBudgetMessage);
        }
      );
    }
  
    private descargarPDF(data: Blob, projectReportModel: ProjectReportModel) {
      const url = window.URL.createObjectURL(data);    
      const a = document.createElement('a');
      a.href = url;
      a.download = 'InformeObra_'+projectReportModel.internalCode+' '+projectReportModel.projectReportName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
}