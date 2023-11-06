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
  budgetForm: FormGroup;
  budgetId?: string;
  currentDate: Date = new Date();
  customers: CustomerModel[] = [];
  showErrors: boolean = false;
  msjError: string = "";

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
      amount: ['0', [Validators.required]],
      date: [new Date()],
      budgetName: ['', [Validators.required]],
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
        });
      }else{
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
      description: [''],
      quantity: [''],
      price: ['']
    });
    this.budgetDetails.push(budgetDetailGroup);
  }

  removeBudgetDetail(index: number) {
    this.budgetDetails.removeAt(index);
  }

  get budgetDetails() {
    return this.budgetForm.get('budgetDetailsDto') as FormArray;
  }

  onAddUpdateBudget() {
    if (this.budgetForm.valid) {
      this.budgetForm.get('date')?.setValue(this.currentDate);
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
            this.msjError = error;
          }
        );
      }
    } else {
      this.showErrors = true;
      this.msjError = "Campos Nombre de la cotización y Cliente son obligatorios";
    }
  }
}
