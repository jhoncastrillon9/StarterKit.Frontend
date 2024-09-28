import { Component, OnInit } from '@angular/core';
import { BudgetModel } from '../models/budget.Model';
import { SendBudgetPdfRequest } from '../models/sendBudgetRequest';
import { BudgetService } from '../services/budget.service';
import { IconSetService } from '@coreui/icons-angular';
import { Router } from '@angular/router';
import { cilPencil, cilXCircle, cilZoom, cilCloudDownload, cilNoteAdd, cilMoney,cilCopy, cilContact, cibMailchimp, cibMailRu, cibMinutemailer} from '@coreui/icons';
import { NgxSpinnerService } from 'ngx-spinner';
import { Table, TableModule} from 'primeng/table';
import { ViewEncapsulation } from '@angular/core';



@Component({
  selector: 'app-list-budget',
  templateUrl: './list-budget.component.html',
  styleUrls: ['./list-budget.component.scss'],
  encapsulation: ViewEncapsulation.None
}) 
export class ListBudgetComponent implements OnInit {
  searchValue: string | undefined;
  loading: boolean = true;
  budgets: BudgetModel[] = [];
  messageModal: string = "¿Listo para deshacerte de este registro? ¡Asegúrate antes de dar el paso!";
  titleModal: string = "¡Espera un momento! ⏳";

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
  
  ClosedOpenModal() {
    this.visible = !this.visible;

    if(!this.visible){
      this.isModalForDelete = false;
      this.isModalForSetInvoice = false;  
      this.isModalForSendEmailBudget = false;
      this.isModalWithError = false;
 
    }
  }

  handleLiveDemoChange(event: any) {
    this.visible = event;
  }

  loadBudgets(){
    this.spinner.show()    
    this.loading = true;
    this.budgetService.get().subscribe(customers => {
      this.budgets = customers;
      this.spinner.hide();
      this.loading = false;
    },(error)=>{
      console.error('Error al cargar Budget', error);
      this.spinner.hide();
      this.loading = false;
      this.openModalError();
    });
  }

  openModalError(){ 
    this.isModalWithError = true;
    this.messageModal = "Parece que hemos encontrado un pequeño obstáculo. Por favor, intenta de nuevo más tarde. Si el problema persiste, no dudes en contactar con el soporte técnico. ¡Prometemos que no es nada personal!";
    this.titleModal = "¡Ups! Algo salió mal ⚠️";
    this.ClosedOpenModal();  
  }


deleteBudgetWithComfirm(budgetModel: BudgetModel){ 
  this.isModalForDelete = true;
  this.budgetToDelete = budgetModel;  
  this.messageModal = "¿Listo para deshacerte de este registro? ¡Asegúrate antes de dar el paso!";
  this.titleModal = "¡Espera un momento! ⏳";
  this.ClosedOpenModal();  
}

  deleteBudget(){      

   if(this.budgetToDelete!=null){
    this.loading = true;
    this.spinner.show()    
      this.budgetService.delete(this.budgetToDelete?.budgetId).subscribe(
        (response: any) => {
          console.log("Budget delete is OK");      
          this.loadBudgets();           
          this.spinner.hide();
          this.loading = false;
        },
        (error) => {
          // Maneja errores y muestra un mensaje al usuario
          console.error('Error al eliminar Budget', error);
          // Puedes mostrar una alerta aquí
          this.spinner.hide();
          this.loading = false;
          this.openModalError();
        }
      );      
   }
   this.ClosedOpenModal();
   this.budgetToDelete = null;
    
  }

  convertToBillWithComfirm(budgetModel: BudgetModel){ 
    this.isModalForSetInvoice = true;    
    this.budgetToSetInvoice = budgetModel;
    this.messageModal = "¿Estas seguro de convertir esta cotización en una factura?";
    this.ClosedOpenModal();    
  }

  convertToBill(){   

    if(this.budgetToSetInvoice!=null){
      this.loading = true;
     this.spinner.show()
     this.budgetToSetInvoice.isInvoice = true;
     
       this.budgetService.setInvoice(this.budgetToSetInvoice).subscribe(
         (response: any) => {
           console.log("SET Invoice OK");      
           this.loadBudgets();           
           this.spinner.hide();
           this.loading = false;
         },
         (error) => {
           // Maneja errores y muestra un mensaje al usuario
           console.error('Error al SET Invoice', error);
           // Puedes mostrar una alerta aquí
           this.spinner.hide();
           this.loading = false;
           this.openModalError();
         }
       );      
    }
    this.ClosedOpenModal();
    this.budgetToSetInvoice = null;
     
   }


   sendEmailBudgetWithComfirm(budgetModel: BudgetModel){ 
    this.isModalForSendEmailBudget = true;
    this.budgetToSendEmail = budgetModel;
    this.titleModal = "¡Cotización en camino! 📬";
    this.messageModal = "Tu cotización se enviará a los siguientes correos electrónicos: "+ budgetModel.customerDto.email+"";
    this.ClosedOpenModal();  
  }

   sendEmailbudget(){      
    this.spinner.show()   
    this.loading = true;  
      var request = new SendBudgetPdfRequest(this.budgetToSendEmail);
      this.budgetService.sendEmailBudget(request).subscribe(
        (response: any) => {
          console.log("send Budget OK");      
          this.loadBudgets();           
          this.spinner.hide();
          this.loading = false;
        },
        (error) => {
          // Maneja errores y muestra un mensaje al usuario
          console.error('Error al COPY Budget', error);
          // Puedes mostrar una alerta aquí
          this.spinner.hide();
          this.loading = false;
          this.openModalError();
        }
      ); 
      this.ClosedOpenModal();
      this.budgetToSendEmail = new BudgetModel;;
  }

   
   copybudget(budgetModel: BudgetModel){      
     this.spinner.show()   
     this.loading = true;  
       this.budgetService.copyBudget(budgetModel).subscribe(
         (response: any) => {
           console.log("COPY Budget OK");      
           this.loadBudgets();           
           this.spinner.hide();
           this.loading = false;
         },
         (error) => {
           // Maneja errores y muestra un mensaje al usuario
           console.error('Error al COPY Budget', error);
           // Puedes mostrar una alerta aquí
           this.spinner.hide();
           this.loading = false;
           this.openModalError();
         }
       ); 
   }


  downloadBudget(customerModel: BudgetModel) {
    this.spinner.show();
    this.loading = true;
    this.budgetService.download(customerModel.budgetId).subscribe(
      (data: Blob) => {
        console.log("Descarga de Budget exitosa");
        this.descargarPDF(data,customerModel);
        this.spinner.hide();
        this.loading = false;
      },
      (error) => {
        // Maneja errores y muestra un mensaje al usuario
        console.error('Error al descargar Budget', error);
        // Puedes mostrar una alerta aquí
        this.spinner.hide(); // Asegúrate de ocultar el spinner en caso de error
        this.loading = false;
        this.openModalError();
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


  }