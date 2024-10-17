import { Component, OnInit, ViewChild } from '@angular/core';
import { BudgetModel } from '../models/budget.Model';
import { SendBudgetPdfRequest } from '../models/sendBudgetRequest';
import { BudgetService } from '../services/budget.service';
import { IconSetService } from '@coreui/icons-angular';
import { Router } from '@angular/router';
import { cilPencil, cilXCircle, cilZoom, cilCloudDownload, cilNoteAdd, cilMoney,cilCopy, cilContact, cibMailchimp, cibMailRu, cibMinutemailer} from '@coreui/icons';
import { NgxSpinnerService } from 'ngx-spinner';
import { Table, TableModule} from 'primeng/table';
import { ViewEncapsulation } from '@angular/core';
import { ConfirmationModalComponent } from 'src/app/shared/components/reusable-modal/reusable-modal.component';


@Component({
  selector: 'app-list-budget',
  templateUrl: './list-budget.component.html',
  styleUrls: ['./list-budget.component.scss'],
  encapsulation: ViewEncapsulation.None
}) 
export class ListBudgetComponent implements OnInit {
  @ViewChild('confirmationModal') confirmationModal!: ConfirmationModalComponent;
  isModalError: boolean = false;
  private readonly successDeleteMessage: string = "¡La cotización ha sido eliminada correctamente!";
  private readonly successSendBusgetMessage: string = "¡Todo listo! Tu correo ha volado hacia sus destinatarios. Si no lo ves pronto, échale un ojo a la carpeta de spam... 😉";
  private readonly successSendBusgetTitle: string = "¡Correo Enviado!";


  private readonly errorGeneralMessage: string = "Algo salió mal. Por favor, intenta de nuevo más tarde. Si el problema persiste, no dudes en contactar con el soporte técnico o intenta refrescar la pagina";
  private readonly errorToSendEmailMessage: string = "Algo salió mal al enviar el email. Por favor, intenta de nuevo más tarde. Si el problema persiste, no dudes en contactar con el soporte técnico o intenta refrescar la pagina";
  private readonly errorTocopyBudgetMessage: string = "Algo salió mal al copiar la cotización. Por favor, intenta de nuevo más tarde. Si el problema persiste, no dudes en contactar con el soporte técnico o intenta refrescar la pagina";
  private readonly errorToDownloadBudgetMessage: string = "Algo salió mal al descargar la cotización. Por favor, intenta de nuevo más tarde. Si el problema persiste, no dudes en contactar con el soporte técnico o intenta refrescar la pagina";

  private readonly successDeleteTitle: string = "¡Eliminación Completada!";
  private readonly errorDeleteMessage: string = "Hubo un problema al intentar eliminar la cotización. Si tienes docuemntos asociados no podemos la podemos eliminar";
  private readonly errorTitle: string = "¡Ups! ocurrió un error.";
  private readonly loadDataError: string = "Algo falló al obtener las cotizaciones. Refresca la página.";
  private readonly deleteMessage: string = "Una vez eliminado, no hay vuelta atrás... bueno, tal vez sí, pero mejor asegúrate antes de despedirlo para siempre. 😅";
  private readonly deleteTitleComfirmation: string = "¿Quieres eliminar esta cotización?";
  private readonly sendEmailTitleComfirmation: string = "¡Cotización en camino! 📬";

  title: string = this.successDeleteTitle;
  messageModal: string = this.successDeleteMessage;

  searchValue: string | undefined;
  loading: boolean = true;
  budgets: BudgetModel[] = [];


  isModalWithError: boolean = false;
  isModalForDelete: boolean = false;
  isModalForSetInvoice: boolean = false;
  isModalForSendEmailBudget: boolean = false;
  
  public visible = false;
  public budgetToDelete: BudgetModel | null = null;
  public budgetToSendEmail: BudgetModel = new BudgetModel;

  public budgetToSetInvoice: BudgetModel | null = null;


  constructor(private budgetService: BudgetService,
    public iconSet: IconSetService,  
    private router: Router,
    private spinner: NgxSpinnerService) {
    iconSet.icons = {  cilPencil,cilXCircle,cilZoom, cilCloudDownload,cilNoteAdd, cilMoney,cilCopy,cilContact, cibMailchimp, cibMailRu, cibMinutemailer};
  }


  ngOnInit() {
    this.loadBudgets();
  }

  clear(table: Table) {
    table.clear();
    this.searchValue = ''
}  


  loadBudgets(){
    this.spinner.show()    
    this.loading = true;
    this.budgetService.get().subscribe(customers => {
      this.budgets = customers;
      this.spinner.hide();
      this.loading = false;
    },(error)=>{
      this.spinner.hide();
      this.loading = false;  
      this.handleError('Error to Load Bugets', this.errorGeneralMessage);
    });
  }

deleteBudgetWithComfirm(budgetModel: BudgetModel){ 
  this.budgetToDelete = budgetModel;
  this.confirmationModal.messageModal = this.deleteMessage;
  this.confirmationModal.title = this.deleteTitleComfirmation;
  this.confirmationModal.isConfirmation = true; 
  this.confirmationModal.titleButtonComfimationYes = 'Si, eliminar';

  // Emitimos la acción a ejecutar cuando se confirme la eliminación
  this.confirmationModal.confirmAction.subscribe(() => this.deleteBudget()); 
  this.confirmationModal.openModal(); 
}

  deleteBudget(){      

   if(this.budgetToDelete!=null){
    this.loading = true;
    this.spinner.show()    
      this.budgetService.delete(this.budgetToDelete?.budgetId).subscribe(
        (response: any) => {
          this.loadBudgets();           
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
   this.budgetToDelete = null;
    
  }

   sendEmailBudgetWithComfirm(budgetModel: BudgetModel){ 
    console.log('sned comfirm');
    this.budgetToSendEmail = budgetModel;
    this.confirmationModal.messageModal = "Tu cotización se enviará a los siguientes correos electrónicos: "+ budgetModel.customerDto.email+"";
    this.confirmationModal.title = this.sendEmailTitleComfirmation;
    this.confirmationModal.isConfirmation = true; 
    this.confirmationModal.titleButtonComfimationYes = 'Si, Enviar';
    // Emitimos la acción a ejecutar cuando se confirme
    this.confirmationModal.confirmAction.subscribe(() => this.sendEmailbudget()); 
    this.confirmationModal.openModal(); 

  }

   sendEmailbudget(){      
    this.spinner.show()   
    this.loading = true;  
      var request = new SendBudgetPdfRequest(this.budgetToSendEmail);
      this.budgetService.sendEmailBudget(request).subscribe(
        (response: any) => {              
          this.loadBudgets();           
          this.spinner.hide();
          this.loading = false;
          this.showModal(false,this.successSendBusgetMessage,this.successSendBusgetTitle,)
        },
        (error) => {
          this.spinner.hide();
          this.loading = false;
          this.handleError('Error to send Bugets', this.errorToSendEmailMessage);
        }
      );     
      this.budgetToSendEmail = new BudgetModel;;
  }

   
   copybudget(budgetModel: BudgetModel){      
     this.spinner.show()   
     this.loading = true;  
       this.budgetService.copyBudget(budgetModel).subscribe(
         (response: any) => {          
           this.loadBudgets();           
           this.spinner.hide();
           this.loading = false;
         },
         (error) => {
           this.spinner.hide();
           this.loading = false;
           this.handleError('Error to copybudget', this.errorTocopyBudgetMessage);

         }
       ); 
   }


  downloadBudget(customerModel: BudgetModel) {
    this.spinner.show();
    this.loading = true;
    this.budgetService.download(customerModel.budgetId).subscribe(
      (data: Blob) => {
        this.descargarPDF(data,customerModel);
        this.spinner.hide();
        this.loading = false;
      },
      (error) => {
        this.spinner.hide(); 
        this.loading = false;
        this.handleError('Error to download Bugets', this.errorToDownloadBudgetMessage);
      }
    );
  }

  private descargarPDF(data: Blob, customerModel: BudgetModel) {
    const url = window.URL.createObjectURL(data);    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Cotizacion_'+customerModel.budgetId+' '+customerModel.budgetName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  getTotal(amount:number){
    var aiu = (amount * 0.1);
    var iva = aiu * 0.19;
    var total = amount + iva;
    return total
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
  showNotify(){
    console.log('show notify');
  }


  }