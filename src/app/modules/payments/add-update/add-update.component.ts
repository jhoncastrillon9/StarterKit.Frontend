import { Component } from '@angular/core';
import { FormGroup, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { cilPencil, cilXCircle, cilMoney } from '@coreui/icons';
import { IconSetService } from '@coreui/icons-angular';
import { NgxSpinnerService } from 'ngx-spinner';

import { PaymentService } from '../services/payment.service';

@Component({
  selector: 'app-add-update',
  templateUrl: './add-update.component.html',
  styleUrls: ['./add-update.component.scss']
})
export class AddUpdateComponent {
  wayToPayDefault: string = "50% Para iniciar la obra, 25% en el transcurso de la obra y 25% Al finalizar Obra";
  deliveryTimeDefault: string = "1 Mes";
  validityOfferDefault: string = "30 días";     
  paymentForm: FormGroup;
  paymentId?: string;
  budgetId?: string;
  currentDate: Date = new Date();  
  showErrors: boolean = false;  
  msjError: string = "";  

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private paymentService: PaymentService,    
    public iconSet: IconSetService,
    private spinner: NgxSpinnerService
  ) {
    this.paymentForm = this.fb.group({
      paymentId: ['0'],
      budgetId: ['0'],
      paymentType: ['',],      
      amountPaid: ['0', [Validators.required, this.validateGreaterThanZero]],
      note: [''],
      paymentDate: [new Date()]
    });

    iconSet.icons = {  cilPencil,cilXCircle, cilMoney};
  }


  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.budgetId = params.get('budgetId')!;
      this.paymentId = params.get('id')!;     

      this.spinner.show();
      if (this.paymentId) {
        this.paymentService.getByPaymentId(this.paymentId).subscribe((payment: any) => {          
          
          this.paymentForm.patchValue(payment);  
          this.spinner.hide();

        },(error)=> {
          console.log(error);
          this.spinner.hide();
        });
      } else {
       this.paymentForm.get('budgetId')?.setValue(this.budgetId);
        this.spinner.hide(); 
      }
    });     
  }


  onAddUpdateBudget() {
    if (this.paymentForm.valid) {
      this.spinner.show();
      this.paymentForm.get('paymentDate')?.setValue(this.currentDate);
      
      const formData = this.paymentForm.value;      
      if (this.paymentId) {
        this.paymentService.update(formData).subscribe(
          (response: any) => {
            this.router.navigate(['/payments']);
            this.spinner.hide();
          },
          (error) => {
            this.showErrors = true;
            this.msjError = error;
            this.spinner.hide();
          }
        );
      } else {
        this.paymentService.add(formData).subscribe(
          (response: any) => {
            this.router.navigate(['/payments']);
            this.spinner.hide();
          },
          (error) => {
            this.showErrors = true;            
            this.msjError = "Error inesperado, revisa la información del formulario";
            this.spinner.hide();
          }
        );
      }
    } else {
      this.showErrors = true;
      this.msjError = "Uppp!!! Parece que faltan campos por completar";
    }
  }

  validateGreaterThanZero(control: AbstractControl): { [key: string]: any } | null {
    const value = parseFloat(control.value);
    if (isNaN(value) || value <= 0) {
      return { 'notGreaterThanZero': true };
    }
    return null;
  }

}
