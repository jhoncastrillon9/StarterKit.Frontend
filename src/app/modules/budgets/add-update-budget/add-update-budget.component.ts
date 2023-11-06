import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BudgetService } from '../services/budget.service';
import { CustomerModel } from '../../customers/models/customer.Model';
import { CustomerService } from '../../customers/services/customer.service';

@Component({
  selector: 'app-add-update-budget',
  templateUrl: './add-update-budget.component.html',
  styleUrls: ['./add-update-budget.component.scss']
})

export class AddUpdateBudgetComponent implements OnInit {
  budgetForm: FormGroup = new FormGroup({});
  budgetId?: string;
  currentDate:Date = new Date();
  customers: CustomerModel[] = [];
  showErrors: boolean = false;
  msjError: string ="";

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private budgetService: BudgetService,
    private customerService: CustomerService
  ) {

  }

  ngOnInit() {
    this.budgetForm = this.fb.group({
      budgetId: ['0'],
      userId: ['0', [Validators.required]],
      customerId: ['0', [Validators.required]],
      amount: ['0', [Validators.required]],
      date:[new Date()],
      budgetName: ['', [Validators.required]],
    });    

    this.route.paramMap.subscribe(params => {
      this.budgetId = params.get('id')!;

      if (this.budgetId) {
        this.budgetService.getById(this.budgetId).subscribe((budget: any) => {
          
          this.budgetForm.patchValue(budget);
        });
      }
    });


    this.loadCustomers();
  }


  loadCustomers(){
    this.customerService.get().subscribe(customers => {
      this.customers = customers;
    });
  }

  onAddUpdateBudget() {
    if (this.budgetForm.valid) {
    // Obtén la fecha y hora actual
    
    
    // Asigna la fecha actual al campo date
    this.budgetForm.get('date')?.setValue(this.currentDate);
 
      const formData = this.budgetForm.value;
      console.log(this.budgetId);
      if (this.budgetId) {
        console.log("Update:");
        console.log(formData);
        this.budgetService.update(formData).subscribe(
          (response: any) => {                 
            this.router.navigate(['/Budgets/budgets']);
          },
          (error) => {
            // Maneja errores y muestra un mensaje al usuario
            console.error('Error al actualizar cliente', error);
            // Puedes mostrar una alerta aquí
          }
        );
      } else {
        console.log("Created:");
        console.log(formData);
        this.budgetService.add(formData).subscribe(
          (response: any) => {                    
            this.router.navigate(['/budgets/budgets']);
          },
          (error) => {
            // Maneja errores y muestra un mensaje al usuario
            this.showErrors = true;
            this.msjError = error;
            console.error('Error al crear presupuesto', error);
            // Puedes mostrar una alerta aquí
          }
        );
      }
    } else {
      // El formulario no es válido, muestra un mensaje de error o realiza alguna acción adicional.
      this.showErrors = true;
      this.msjError = "Campos Nombre de la cotización y Cliente son obligatorios"
      console.log('El formulario no es válido. Por favor, complete los campos correctamente.');
    }
  }
  
}
