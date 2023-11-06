import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CustomerService } from '../services/customer.service';

@Component({
  selector: 'app-add-update-customer',
  templateUrl: './add-update-customer.component.html',
  styleUrls: ['./add-update-customer.component.scss']
})
export class AddUpdateCustomerComponent implements OnInit {
  customerForm: FormGroup = new FormGroup({});
  customerId?: string;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private customerService: CustomerService
  ) {

  }

  ngOnInit() {
    this.customerForm = this.fb.group({
      email: ['', [Validators.email]],
      customerName: ['', [Validators.required]],
      customId: [''],
      address: [''],
      customerId: ['0'],
    });

    this.route.paramMap.subscribe(params => {
      this.customerId = params.get('id')!;
console.log(this.customerId);

      if (this.customerId) {
        this.customerService.getById(this.customerId).subscribe((customer: any) => {
          console.log(customer);
          this.customerForm.patchValue(customer);
        });
      }
    });
  }

  onAddUpdateCustomer() {
    if (this.customerForm.valid) {
      const formData = this.customerForm.value;
      
      if (this.customerId) {
        this.customerService.update(formData).subscribe(
          (response: any) => {
            console.log("Customer is OK");          
            this.router.navigate(['/customers/customers']);
          },
          (error) => {
            // Maneja errores y muestra un mensaje al usuario
            console.error('Error al actualizar cliente', error);
            // Puedes mostrar una alerta aquí
          }
        );
      } else {
        
        this.customerService.add(formData).subscribe(
          (response: any) => {
            console.log("Customer is OK");          
            this.router.navigate(['/customers/customers']);
          },
          (error) => {
            // Maneja errores y muestra un mensaje al usuario
            console.error('Error al crear cliente', error);
            // Puedes mostrar una alerta aquí
          }
        );
      }
    } else {
      // El formulario no es válido, muestra un mensaje de error o realiza alguna acción adicional.
      console.log('El formulario no es válido. Por favor, complete los campos correctamente.');
    }
  }
  
}
