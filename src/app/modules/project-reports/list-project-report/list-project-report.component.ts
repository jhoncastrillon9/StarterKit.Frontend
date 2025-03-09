import { Component, OnInit, ViewChild } from '@angular/core';
import { ProjectReportService } from '../services/projectReportService.service';
import { ProjectReportModel } from '../models/projectReport.Model';
import { cilEnvelopeOpen, flagSet } from '@coreui/icons';
import { IconModule, IconSetService } from '@coreui/icons-angular';
import { cilPencil, cilXCircle, cilZoom, cilCloudDownload, cilNoteAdd, cilMoney} from '@coreui/icons';
import { Router, RouterModule } from '@angular/router';
import { Table, TableModule} from 'primeng/table';
import { ViewEncapsulation } from '@angular/core';
import { SharedModule } from '../../../shared.module';
import { CommonModule } from '@angular/common';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { ButtonGroupModule, ButtonModule, CardModule, DropdownModule, FormModule, GridModule, ListGroupModule, ModalModule } from '@coreui/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
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
import { CustomSharedModule} from '../../../shared/shared.module';
import { ConfirmationModalComponent } from '../../../shared/components/reusable-modal/reusable-modal.component';
import { SendProjectReportPdfRequest } from '../models/SendProjectReportPdfRequest';

@Component({
  selector: 'app-list-project-report',
  standalone: true,
  imports: [    SharedModule,     CommonModule,         RouterModule,     NgxSpinnerModule,         CardModule,     FormModule,     GridModule,     FormsModule,     ButtonModule,     ReactiveFormsModule,     FormModule,
       PrimeButtonModule,     DropdownModule,    SharedModule,    ListGroupModule,    IconModule,    ModalModule,    TableModule,    InputTextModule,    InputIconModule,    IconFieldModule,    StyleClassModule,    InputMaskModule,
      InputSwitchModule,    InputNumberModule,    InputTextareaModule,    InputGroupAddonModule,    InputGroupModule,    InputOtpModule, CustomSharedModule
      ],
  templateUrl: './list-project-report.component.html',
  styleUrl: './list-project-report.component.scss',
  encapsulation: ViewEncapsulation.None

})
export class ListProjectReportComponent {
    @ViewChild('confirmationModal') confirmationModal!: ConfirmationModalComponent;
    isModalError: boolean = false;
    searchValue: string | undefined;
    loading: boolean = true;
    projectReports: ProjectReportModel[] = [];
      public projectReportToDelete: ProjectReportModel | null = null;
      public projectReportToSendEmail: ProjectReportModel = new ProjectReportModel;
  
      private readonly successSendBusgetMessage: string = "¡Todo listo! Tu correo ha volado hacia sus destinatarios. Si no lo ves pronto, échale un ojo a la carpeta de spam... 😉";
      private readonly successSendBusgetTitle: string = "¡Correo Con informe Enviado!";   
    
      private readonly errorToSendEmailMessage: string = "Algo salió mal al enviar el email. Por favor, intenta de nuevo más tarde. Si el problema persiste, no dudes en contactar con el soporte técnico o intenta refrescar la pagina";
      private readonly errorToDownloadBudgetMessage: string = "Algo salió mal al descargar el informe de obra. Por favor, intenta de nuevo más tarde. Si el problema persiste, no dudes en contactar con el soporte técnico o intenta refrescar la pagina";
      private readonly errorGeneralMessage: string = "Algo salió mal. Por favor, intenta de nuevo más tarde. Si el problema persiste, no dudes en contactar con el soporte técnico o intenta refrescar la pagina";

      private readonly successDeleteTitle: string = "¡Eliminación Completada!";
      private readonly errorDeleteMessage: string = "Hubo un problema al intentar eliminar el informe de obra. Si tienes documentos asociados no podemos la podemos eliminar";      
      private readonly deleteMessage: string = "Una vez eliminado, no hay vuelta atrás... bueno, tal vez sí, pero mejor asegúrate antes de despedirlo para siempre. 😅";
      private readonly deleteTitleComfirmation: string = "¿Quieres eliminar este informe de obra?";
      private readonly sendEmailTitleComfirmation: string = "Informe de obra en camino! 📬";

    private readonly errorTitle: string = "Oops, ocurrió un error.";
    private readonly loadDataErrorMessage: string = "Algo falló al obtener los reportes. Refresca la página.";
    title: string = this.errorTitle;
    messageModal: string = this.loadDataErrorMessage;
  
    constructor(private projectReportService: ProjectReportService,
      public iconSet: IconSetService,  
      private router: Router,
      private spinner: NgxSpinnerService) {
      iconSet.icons = {  cilPencil,cilXCircle,  cilZoom, cilCloudDownload, cilNoteAdd, cilMoney };
    }
  
  
    ngOnInit() {
      this.fetchProjectReports();
    }
  
    fetchProjectReports() {
      this.spinner.show();
    

      this.projectReportService.get().subscribe(projectReports => {
        this.projectReports = projectReports;
        this.spinner.hide();
        this.loading = false;
      },(error)=>{
        this.spinner.hide();
        this.handleError('Error to Load ProjectReports', this.errorGeneralMessage);
      });    
      this.spinner.hide();
    }


    
  loadBudgets(){
    this.spinner.show()    
    this.loading = true;
  }
  
    clear(table: Table) {
      table.clear();
      this.searchValue = ''
  }
  
  
  private handleError(consoleMessage: string, modalMessage: string) {
    console.error(consoleMessage);
    this.showModal(true, modalMessage, this.errorTitle);
  }
  
  showModal(isError: boolean, message: string, title: string) {
    this.confirmationModal.isModalError = isError;
    this.confirmationModal.title = title;
    this.confirmationModal.messageModal = message;
    this.confirmationModal.isConfirmation = false; // Aseguramos que no esté en modo confirmación
    this.confirmationModal.openModal();
  }

deleteProjectReportWithComfirm(projectReport: ProjectReportModel){ 
  this.projectReportToDelete = projectReport;
  this.confirmationModal.messageModal = this.deleteMessage;
  this.confirmationModal.title = this.deleteTitleComfirmation;
  this.confirmationModal.isConfirmation = true; 
  this.confirmationModal.titleButtonComfimationYes = 'Si, eliminar';

  // Emitimos la acción a ejecutar cuando se confirme la eliminación
  this.confirmationModal.confirmAction.subscribe(() => this.deleteProjectReport()); 
  this.confirmationModal.openModal(); 
}

  deleteProjectReport(){      

   if(this.projectReportToDelete!=null){
    this.loading = true;
    this.spinner.show()    
      this.projectReportService.delete(this.projectReportToDelete?.budgetId).subscribe(
        (response: any) => {
          this.fetchProjectReports();           
          this.spinner.hide();
          this.loading = false;
        },
        (error) => {
          this.spinner.hide();
          this.loading = false;
          this.handleError('Error to delete Bugets', this.errorDeleteMessage);
        }
      );      
   }
   this.projectReportToDelete = null;
    
  }

   sendEmailProjectReportWithComfirm(projectReport: ProjectReportModel){ 
    this.projectReportToSendEmail = projectReport;
    this.confirmationModal.messageModal = "El informe se enviará a los siguientes correos electrónicos: "+ projectReport.customerDto.email+"";
    this.confirmationModal.title = this.sendEmailTitleComfirmation;
    this.confirmationModal.isConfirmation = true; 
    this.confirmationModal.titleButtonComfimationYes = 'Si, Enviar';
    // Emitimos la acción a ejecutar cuando se confirme
    this.confirmationModal.confirmAction.subscribe(() => this.sendEmailProjectReport()); 
    this.confirmationModal.openModal(); 

  }

   sendEmailProjectReport(){      
    this.spinner.show()   
    this.loading = true;  
      var request = new SendProjectReportPdfRequest(this.projectReportToSendEmail);
      this.projectReportService.sendEmailBudget(request).subscribe(
        (response: any) => {              
          this.fetchProjectReports();           
          this.spinner.hide();
          this.loading = false;
          this.showModal(false,this.successSendBusgetMessage,this.successSendBusgetTitle,)
        },
        (error) => {
          this.spinner.hide();
          this.loading = false;
          this.handleError('Error to send Reports', this.errorToSendEmailMessage);
        }
      );     
      this.projectReportToSendEmail = new ProjectReportModel;;
  }  
  
  downloadProjectReport(customerModel: ProjectReportModel) {
    this.spinner.show();
    this.loading = true;
    this.projectReportService.download(customerModel.budgetId).subscribe(
      (data: Blob) => {
        this.descargarPDF(data,customerModel);
        this.spinner.hide();
        this.loading = false;
      },
      (error) => {
        this.spinner.hide(); 
        this.loading = false;
        this.handleError('Error to download Reports', this.errorToDownloadBudgetMessage);
      }
    );
  }

  private descargarPDF(data: Blob, customerModel: ProjectReportModel) {
    const url = window.URL.createObjectURL(data);    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Informe_'+customerModel.internalCode+' '+customerModel.budgetName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }


}
