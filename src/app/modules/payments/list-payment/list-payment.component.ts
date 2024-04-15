import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { cilCloudDownload, cilMoney, cilNoteAdd, cilPencil, cilXCircle, cilZoom } from '@coreui/icons';
import { IconSetService } from '@coreui/icons-angular';
import { NgxSpinnerService } from 'ngx-spinner';
import { PaymentService } from '../services/payment.service';
import { PaymentGroupModel, PaymentModel } from '../models/payment.Model';



@Component({
  selector: 'app-list-payment',
  templateUrl: './list-payment.component.html',
  styleUrls: ['./list-payment.component.scss']
})
export class ListPaymentComponent {

  PaymentGroups: PaymentGroupModel[] = [];
  messageModal: string = "¿Estas Seguro de eliminar este registro?";
  isModalForDelete: boolean = false;


  public visible = false;
  public paymentToDelete: PaymentModel | null = null;
  public paymentToSetInvoice: PaymentModel | null = null;

  constructor(private paymentService: PaymentService,
    public iconSet: IconSetService,  
    private router: Router,
    private spinner: NgxSpinnerService) {
    iconSet.icons = {  cilPencil,cilXCircle,cilZoom, cilCloudDownload,cilNoteAdd, cilMoney};
  }

  
  ngOnInit() {
    this.loadPayments();
  }

  ClosedOpenModal() {
 
    this.visible = !this.visible;

    if(!this.visible){
      this.isModalForDelete = false;
    }
  }

  loadPayments(){
    this.spinner.show()    
    this.paymentService.get().subscribe(payments => {
      this.PaymentGroups = payments;
      this.spinner.hide();
    },(error)=>{
      console.error('Error al cargar payments', error);
      this.spinner.hide();
    });
  }


deletePaymentWithComfirm(paymentModel: PaymentModel){ 
  this.isModalForDelete = true;
  this.paymentToDelete = paymentModel;
  this.messageModal = "¿Estas Seguro de eliminar este registro?";
  this.ClosedOpenModal();  
}

  deletePayment(){      

   if(this.paymentToDelete!=null){
    this.spinner.show()    
      this.paymentService.delete(this.paymentToDelete?.budgetId).subscribe(
        (response: any) => {
          console.log("Budget delete is OK");      
          this.loadPayments();           
          this.spinner.hide();
        },
        (error) => {
          // Maneja errores y muestra un mensaje al usuario
          console.error('Error al eliminar Budget', error);
          // Puedes mostrar una alerta aquí
          this.spinner.hide();
        }
      );      
   }
   this.ClosedOpenModal();
   this.paymentToDelete = null;
    
  }
  
}
