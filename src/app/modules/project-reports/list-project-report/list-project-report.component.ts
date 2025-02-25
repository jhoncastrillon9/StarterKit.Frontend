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
    
      this.projectReports = [
        {
          projectReportId: 1,
          budgetId: 101,
          customerId: 201,
          internalCode: 301,
          budgetInternalCode: 401,
          projectReportName: "Project Report 1",
          budgetName: "Budget 1",
          note: "Note 1",
          date: new Date(2025,12,31),
          budgetDetailsDto: [
            {
              projectReporDetailtId: 1,
              budgetDetailId: 501,
              projectReporId: 1,
              description: "Detail 1",
              urlImage: "http://example.com/image1.jpg"
            }
          ],
          curtomerName: "Customer 1"
        },
        {
          projectReportId: 2,
          budgetId: 102,
          customerId: 202,
          internalCode: 302,
          budgetInternalCode: 402,
          projectReportName: "Project Report 2",
          budgetName: "Budget 2",
          note: "Note 2",
          date: new Date(),
          budgetDetailsDto: [
            {
              projectReporDetailtId: 2,
              budgetDetailId: 502,
              projectReporId: 2,
              description: "Detail 2",
              urlImage: "http://example.com/image2.jpg"
            }
          ],
          curtomerName: "Customer 2"
        },
        {
          projectReportId: 3,
          budgetId: 103,
          customerId: 203,
          internalCode: 303,
          budgetInternalCode: 403,
          projectReportName: "Project Report 3",
          budgetName: "Budget 3",
          note: "Note 3",
          date: new Date(),
          budgetDetailsDto: [
            {
              projectReporDetailtId: 3,
              budgetDetailId: 503,
              projectReporId: 3,
              description: "Detail 3",
              urlImage: "http://example.com/image3.jpg"
            }
          ],
          curtomerName: "Customer 3"
        },
        {
          projectReportId: 4,
          budgetId: 104,
          customerId: 204,
          internalCode: 304,
          budgetInternalCode: 404,
          projectReportName: "Project Report 4",
          budgetName: "Budget 4",
          note: "Note 4",
          date: new Date(),
          budgetDetailsDto: [
            {
              projectReporDetailtId: 4,
              budgetDetailId: 504,
              projectReporId: 4,
              description: "Detail 4",
              urlImage: "http://example.com/image4.jpg"
            }
          ],
          curtomerName: "Customer 4"
        },
        {
          projectReportId: 5,
          budgetId: 105,
          customerId: 205,
          internalCode: 305,
          budgetInternalCode: 405,
          projectReportName: "Project Report 5",
          budgetName: "Budget 5",
          note: "Note 5",
          date: new Date(),
          budgetDetailsDto: [
            {
              projectReporDetailtId: 5,
              budgetDetailId: 505,
              projectReporId: 5,
              description: "Detail 5",
              urlImage: "http://example.com/image5.jpg"
            }
          ],
          curtomerName: "Customer 5"
        }
      ];
    
      this.loading = false;
      this.spinner.hide();
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
}
