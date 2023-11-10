import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BudgetService } from '../services/budget.service';
import { CustomerModel } from '../../customers/models/customer.Model';
import { CustomerService } from '../../customers/services/customer.service';
import { cilPencil, cilXCircle } from '@coreui/icons';
import { IconSetService } from '@coreui/icons-angular';
@Component({
  selector: 'app-add-update-budget',
  templateUrl: './add-update-budget.component.html',
  styleUrls: ['./add-update-budget.component.scss']
})

export class AddUpdateBudgetComponent implements OnInit {
  wayToPayDefault: string = "50% Para iniciar la obra, 25% en el transcurso de la obra y 25% Al finalizar Obra";
  deliveryTimeDefault: string = "1 Mes";
  validityOfferDefault: string = "30 días";  
  budgetForm: FormGroup;
  budgetId?: string;
  currentDate: Date = new Date();
  customers: CustomerModel[] = [];
  showErrors: boolean = false;
  msjError: string = "";
  
  //Campos calculados
  amount: number = 0;  
  aiu: number = 0;
  iva: number = 0;
  total: number = 0;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private budgetService: BudgetService,
    private customerService: CustomerService,
    public iconSet: IconSetService,
  ) {
    this.budgetForm = this.fb.group({
      budgetId: ['0'],
      userId: ['0', [Validators.required]],
      customerId: ['0', [Validators.required]],
      amount: [this.amount, [Validators.required]],
      date: [new Date()],
      budgetName: ['', [Validators.required]],
      wayToPay: [this.wayToPayDefault],
      deliveryTime: [this.deliveryTimeDefault],
      validityOffer: [this.validityOfferDefault],
      note: [''],
      budgetDetailsDto: this.fb.array([]) // Inicializa el FormArray para los detalles del presupuesto
    });

    iconSet.icons = {  cilPencil,cilXCircle };
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.budgetId = params.get('id')!;
  
      if (this.budgetId) {
        this.budgetService.getById(this.budgetId).subscribe((budget: any) => {
          console.log(budget);
          this.budgetForm.patchValue(budget);
  
          // Agrega el código aquí para cargar los detalles del presupuesto
          if (budget && budget.budgetDetailsDto) {
            const detailsArray = this.budgetForm.get('budgetDetailsDto') as FormArray;
            detailsArray.clear(); // Limpia los detalles existentes si los hubiera
  
            budget.budgetDetailsDto.forEach((detail: any) => {
              const budgetDetailGroup = this.fb.group({
                budgetDetailId: detail.budgetDetailId,
                budgetId: detail.budgetId,
                description: detail.description,
                quantity: detail.quantity,
                price: detail.price,
                subtotal: detail.quantity * detail.price,
              });
              detailsArray.push(budgetDetailGroup);
            });
  
            // Actualiza el total después de cargar los detalles
            this.updateAmount();
          }
        });
      } else {
        console.log("test addBudgetDetail");
        //this.addBudgetDetail();
      }
    });
  
    this.loadCustomers();
  }

  loadCustomers() {
    this.customerService.get().subscribe(customers => {
      this.customers = customers;
    });
  }

  addBudgetDetail() {
    const budgetDetailGroup = this.fb.group({
      budgetDetailId: [0],
      budgetId: [0],
      description: ['', [Validators.required]],
      quantity: [null, [Validators.required, Validators.pattern(/^\d+$/)]], // Validación para números enteros
      price: [null, [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]], // Validación para números con o sin decimales
      // No se requieren enviar al back
      subtotal: [0],
    });
    this.budgetDetails.push(budgetDetailGroup);
    this.updateAmount();
  }

  removeBudgetDetail(index: number) {
    this.budgetDetails.removeAt(index);
    this.updateAmount();
  }

  get budgetDetails() {
    return this.budgetForm.get('budgetDetailsDto') as FormArray;
  }

  onAddUpdateBudget() {
    if (this.budgetForm.valid) {
      this.budgetForm.get('date')?.setValue(this.currentDate);
      this.budgetForm.get('amount')?.setValue(this.amount);
      const formData = this.budgetForm.value;
      console.log(formData);
      if (this.budgetId) {
        this.budgetService.update(formData).subscribe(
          (response: any) => {
            this.router.navigate(['/budgets/budgets']);
          },
          (error) => {
            this.showErrors = true;
            this.msjError = error;
          }
        );
      } else {
        this.budgetService.add(formData).subscribe(
          (response: any) => {
            this.router.navigate(['/budgets/budgets']);
          },
          (error) => {
            this.showErrors = true;            
            this.msjError = "Error inesperado, revisa la información del formulario";
          }
        );
      }
    } else {
      this.showErrors = true;
      this.msjError = "Uppp!!! Parece que faltan campos por completar";
    }
  }

  calculateSubtotalForDetails(index: number) {
    const quantity = this.budgetDetails.at(index).get('quantity')?.value;
    const price = this.budgetDetails.at(index).get('price')?.value;
    if (quantity !== null && price !== null) {
      const subtotal = quantity * price;
      this.budgetDetails.at(index).get('subtotal')?.setValue(subtotal.toLocaleString());
      this.updateAmount();
    }
  }

  updateAmount() {
    this.amount = 0; // Reinicializa el total    
    this.budgetDetails.controls.forEach((control) => {
      const subtotal = control.get('subtotal')?.value;     
  
      if (subtotal !== null) {
        // Convierte el valor en una cadena de texto y luego realiza el reemplazo
        const sanitizedSubtotal = String(subtotal).replace(/,/g, '').replace(/\./g, '');
  
        // Convierte la cadena sin separadores de miles en número
        this.amount += parseFloat(sanitizedSubtotal);
      }
    });

    this.setCalculatesTotals()
  }

  setCalculatesTotals() {
    this.aiu = this.amount * 0.1; // Calculas el AIU
    this.iva = this.aiu * 0.19; // Calculas el IVA
    this.total = this.amount + this.iva; // Calculas el total
}
  

}