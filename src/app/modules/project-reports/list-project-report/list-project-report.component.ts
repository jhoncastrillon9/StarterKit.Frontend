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
import { EmailSelectorModalComponent, EmailSelectionResult } from '../../../shared/components/email-selector-modal/email-selector-modal.component';
import { SendProjectReportPdfRequest } from '../models/SendProjectReportPdfRequest';
import { TooltipModule } from 'primeng/tooltip';
import { DataTableComponent } from 'src/app/shared/ui/data-table/data-table.component';
import { DataTableColumnDirective } from 'src/app/shared/ui/data-table/data-table-column.directive';
import { ClientAvatarComponent } from 'src/app/shared/ui/client-avatar/client-avatar.component';
import { DataTableColumn, KpiDef } from 'src/app/shared/ui/data-table/data-table.types';

/** Una obra con todos sus informes, ordenados del mas reciente al mas antiguo. */
interface ObraConInformes {
  budgetId: number;
  budgetInternalCode: number;
  obra: string;
  cliente: string;
  informes: ProjectReportModel[];
}

@Component({
  selector: 'app-list-project-report',
  standalone: true,
  imports: [    SharedModule,     CommonModule,         RouterModule,     NgxSpinnerModule,         CardModule,     FormModule,     GridModule,     FormsModule,     ButtonModule,     ReactiveFormsModule,     FormModule,
       PrimeButtonModule,     DropdownModule,    SharedModule,    ListGroupModule,    IconModule,    ModalModule,    TableModule,    InputTextModule,    InputIconModule,    IconFieldModule,    StyleClassModule,    InputMaskModule,
      InputSwitchModule,    InputNumberModule,    InputTextareaModule,    InputGroupAddonModule,    InputGroupModule,    InputOtpModule, CustomSharedModule,
      TooltipModule, DataTableComponent, DataTableColumnDirective, ClientAvatarComponent
      ],
  templateUrl: './list-project-report.component.html',
  styleUrl: './list-project-report.component.scss',
  encapsulation: ViewEncapsulation.None

})
export class ListProjectReportComponent {
    @ViewChild('confirmationModal') confirmationModal!: ConfirmationModalComponent;
    @ViewChild('emailSelectorModal') emailSelectorModal!: EmailSelectorModalComponent;
    isModalError: boolean = false;
    searchValue: string | undefined;
    loading: boolean = true;
    projectReports: ProjectReportModel[] = [];

    /**
     * Vista activa. 'obras' agrupa los informes por la obra a la que pertenecen,
     * que es como piensa un constructor; 'listado' conserva la tabla de siempre
     * para quien busque un registro concreto.
     */
    viewMode: 'obras' | 'listado' = 'obras';

    /** Texto del buscador de la vista por obra. */
    obrasSearch = '';

    setViewMode(mode: 'obras' | 'listado'): void {
      this.viewMode = mode;
    }

    /**
     * Informes agrupados por obra y ordenados por el mas reciente. Se recalcula
     * solo al cambiar los datos o la busqueda, no en cada ciclo de deteccion.
     */
    obras: ObraConInformes[] = [];

    private recalcObras(): void {
      const term = this.obrasSearch.trim().toLowerCase();

      const visibles = term
        ? this.projectReports.filter(r =>
            [r.projectReportName, r.budgetDTO?.budgetName, r.customerDto?.customerName,
             String(r.budgetInternalCode), r.note]
              .some(v => (v || '').toString().toLowerCase().includes(term)))
        : this.projectReports;

      const porObra = new Map<number, ObraConInformes>();

      for (const r of visibles) {
        const key = r.budgetId || 0;
        let grupo = porObra.get(key);
        if (!grupo) {
          grupo = {
            budgetId: key,
            budgetInternalCode: r.budgetInternalCode,
            obra: r.budgetDTO?.budgetName || 'Sin obra asociada',
            cliente: r.customerDto?.customerName || 'Sin cliente',
            informes: [],
          };
          porObra.set(key, grupo);
        }
        grupo.informes.push(r);
      }

      for (const g of porObra.values()) {
        g.informes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }

      this.obras = [...porObra.values()].sort((a, b) =>
        new Date(b.informes[0]?.date ?? 0).getTime() - new Date(a.informes[0]?.date ?? 0).getTime());
    }

    onObrasSearch(value: string): void {
      this.obrasSearch = value;
      this.recalcObras();
    }

    /** Hasta tres fotos del informe, que es lo que se ve en la tira. */
    fotos(report: ProjectReportModel): string[] {
      return (report.projectReportDetailsDTO || [])
        .map(d => d.urlImage)
        .filter((u): u is string => !!u)
        .slice(0, 3);
    }

    /** Fotos que no caben en la tira; 0 si caben todas. */
    fotosRestantes(report: ProjectReportModel): number {
      const total = (report.projectReportDetailsDTO || []).filter(d => !!d.urlImage).length;
      return Math.max(0, total - 3);
    }

    tableColumns: DataTableColumn[] = [
      { field: 'projectReportId', header: 'Cod', sortable: true, width: '90px', filter: { type: 'text', placeholder: 'Codigo' } },
      { field: 'date', header: 'Fecha', sortable: true, width: '130px', filter: { type: 'dateRange' } },
      { field: 'projectReportName', header: 'Nombre', sortable: true, filter: { type: 'text', placeholder: 'Nombre' } },
      { field: 'budgetInternalCode', header: 'Cod Cotización', sortable: true, width: '150px', filter: { type: 'text', placeholder: 'Cotizacion' } },
      { field: 'budgetDTO.budgetName', header: 'Cotización', sortable: true, filter: { type: 'text', placeholder: 'Obra' } },
      { field: 'customerDto.customerName', header: 'Cliente', sortable: true, filter: { type: 'text', placeholder: 'Cliente' } },
      { field: 'acciones', header: 'Acciones', align: 'right', width: '180px' },
    ];

    get kpis(): KpiDef[] {
      const obras = new Set(this.projectReports.map(r => r.budgetId)).size;
      const fotos = this.projectReports.reduce(
        (acc, r) => acc + (r.projectReportDetailsDTO || []).filter(d => !!d.urlImage).length, 0);
      return [
        { key: 'total', label: 'Informes', value: this.projectReports.length, dotColor: '#6d28d9' },
        { key: 'obras', label: 'Obras', value: obras, dotColor: '#1d4ed8' },
        { key: 'fotos', label: 'Fotos', value: fotos, dotColor: '#15703f' },
      ];
    }

      public projectReportToDelete: ProjectReportModel | null = null;
      public projectReportToSendEmail: ProjectReportModel = new ProjectReportModel;
      public availableEmails: string[] = [];
      public selectedEmailsToSend: string[] = [];
  
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
        this.recalcObras();
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

  // La accion de confirmar se enlaza por plantilla ((confirmAction)="deleteProjectReport()").
  // Antes se suscribia aqui en cada apertura y solo no duplicaba el borrado porque
  // ConfirmationModalComponent.closeModal() recreaba el EventEmitter. Ese reemplazo ya no
  // existe, asi que suscribirse aqui acumularia suscripciones.
  this.confirmationModal.openModal();
}

  deleteProjectReport(){      

   if(this.projectReportToDelete!=null){
    this.loading = true;
    this.spinner.show()    
      this.projectReportService.delete(this.projectReportToDelete?.projectReportId).subscribe(
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
    // Extraer emails del cliente (separados por ; o ,)
    const emailString = projectReport.customerDto.email || '';
    this.availableEmails = emailString
      .split(/[;,]/)
      .map(e => e.trim())
      .filter(e => e.length > 0);
    
    if (this.availableEmails.length === 0) {
      this.showModal(true, 'El cliente no tiene correos electrónicos configurados.', 'Sin correos');
      return;
    }
    
    // Abrir el modal de selección de emails
    this.emailSelectorModal.emails = this.availableEmails;
    this.emailSelectorModal.title = this.sendEmailTitleComfirmation;
    this.emailSelectorModal.confirmButtonText = 'Enviar Informe';
    this.emailSelectorModal.openModal();
  }

  onEmailsSelected(result: EmailSelectionResult) {
    this.selectedEmailsToSend = result.emails;
    this.sendEmailProjectReport();
  }

   sendEmailProjectReport(){      
    this.spinner.show()   
    this.loading = true;  
      var request = new SendProjectReportPdfRequest(this.projectReportToSendEmail, this.selectedEmailsToSend);
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
      this.projectReportToSendEmail = new ProjectReportModel;
      this.selectedEmailsToSend = [];
  }  
  
  downloadProjectReport(projectReportModel: ProjectReportModel) {
    this.spinner.show();
    this.loading = true;
    this.projectReportService.download(projectReportModel.projectReportId).subscribe(
      (data: Blob) => {
        this.descargarPDF(data,projectReportModel);
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

  private descargarPDF(data: Blob, projectReportModel: ProjectReportModel) {
    const url = window.URL.createObjectURL(data);    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Informe_'+projectReportModel.internalCode+'_cotizacion_'+projectReportModel.budgetInternalCode;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }


}
