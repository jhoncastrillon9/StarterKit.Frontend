import { Component, OnInit } from '@angular/core';
import { CustomerModel } from '../models/customer.Model';
import { CustomerService } from '../services/customer.service';
import { cilEnvelopeOpen, flagSet } from '@coreui/icons';
import { IconSetService } from '@coreui/icons-angular';
import { cilPencil, cilXCircle, cilZoom, cilCloudDownload, cilNoteAdd, cilMoney} from '@coreui/icons';
import { Router } from '@angular/router';
 

@Component({
  selector: 'app-listcustomer',
  templateUrl: './listcustomer.component.html',
  styleUrls: ['./listcustomer.component.scss']
})
export class ListcustomerComponent implements OnInit {
  customers: CustomerModel[] = [];
  constructor(private customerService: CustomerService,public iconSet: IconSetService,  private router: Router) {
    iconSet.icons = {  cilPencil,cilXCircle,  cilZoom, cilCloudDownload, cilNoteAdd, cilMoney };
  }


  ngOnInit() {
    this.loadCustomers();
  }

  loadCustomers(){
    this.customerService.get().subscribe(customers => {
      this.customers = customers;
    });
  }

  deleteCustomer(customerModel: CustomerModel){
    console.log('start deleteCustomer');
    console.log(customerModel);
      this.customerService.delete(customerModel.customerId).subscribe(
        (response: any) => {
          console.log("Customer delete is OK");      
          this.loadCustomers();           
        },
        (error) => {
          // Maneja errores y muestra un mensaje al usuario
          console.error('Error al eliminar cliente cliente', error);
          // Puedes mostrar una alerta aquí
        }
      );

  }


  }



