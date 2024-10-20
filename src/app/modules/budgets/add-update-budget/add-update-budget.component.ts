import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, ValidatorFn, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BudgetService } from '../services/budget.service';
import { CustomerModel } from '../../customers/models/customer.Model';
import { CustomerService } from '../../customers/services/customer.service';
import { cilPencil, cilXCircle, cilMoney } from '@coreui/icons';
import { IconSetService } from '@coreui/icons-angular';
import { NgxSpinnerService } from 'ngx-spinner';
import { ApuModel } from '../../apus/models/apu.Model';
import { ApuService } from '../../apus/services/apu.service';
import { ConfirmationModalComponent } from 'src/app/shared/components/reusable-modal/reusable-modal.component';
@Component({
  selector: 'app-add-update-budget',
  templateUrl: './add-update-budget.component.html',
  styleUrls: ['./add-update-budget.component.scss']
})

export class AddUpdateBudgetComponent implements OnInit {
  @ViewChild('confirmationModal') confirmationModal!: ConfirmationModalComponent;
  isModalError: boolean = false;
  private readonly errorTitle: string = "¡Ups! ocurrió un error.";
  title: string = '';
  messageModal: string = "¡Los formatos de tus cotizaciones han sido actualizados correctamente!";
  private readonly errorGeneralMessage: string = "Algo salió mal. Por favor, intenta de nuevo más tarde. Si el problema persiste, no dudes en contactar con el soporte técnico o intenta refrescar la pagina";

  wayToPayDefault: string = "50% Para iniciar la obra, 25% en el transcurso de la obra y 25% Al finalizar Obra";
  deliveryTimeDefault: string = "1 Mes";
  validityOfferDefault: string = "30 días";
  budgetForm: FormGroup;
  budgetId?: string;
  currentDate: Date = new Date();
  customers: CustomerModel[] = [];
  showErrors: boolean = false;
  msjError: string = "";
  titlePage: string = "Nueva cotización";
  visible = false;


  searchTerm = '';
  selectedItems: ApuModel[] = [];
  apuModels: ApuModel[] = [];
  private localStorageKey = 'apuModelsData';
  private expiryKey = 'apuModelsExpiry';

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
    private apuService: ApuService,
    public iconSet: IconSetService,
    private spinner: NgxSpinnerService
  ) {
    this.budgetForm = this.fb.group({
      budgetId: ['0'],
      userId: ['0', [Validators.required]],
      customerId: ['', [Validators.required, numberGreaterThanZeroValidator()]], // Aplica el validador aquí
      amount: [this.amount, [Validators.required]],
      date: [new Date()],
      budgetName: ['', [Validators.required]],
      wayToPay: [this.wayToPayDefault],
      deliveryTime: [this.deliveryTimeDefault],
      validityOffer: [this.validityOfferDefault],
      note: [''],
      sumAIU: [true],
      budgetDetailsDto: this.fb.array([]) // Inicializa el FormArray para los detalles del presupuesto
    });

    iconSet.icons = { cilPencil, cilXCircle, cilMoney };

  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.budgetId = params.get('id')!;
      this.spinner.show();
      if (this.budgetId) {
        this.titlePage="Editar cotización";
        this.budgetService.getById(this.budgetId).subscribe((budget: any) => {

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
                unitMeasurement: detail.unitMeasurement,
                quantity: detail.quantity,
                price: detail.price,
                subtotal: detail.quantity * detail.price,
              });
              detailsArray.push(budgetDetailGroup);
            });

            // Actualiza el total después de cargar los detalles
            this.updateAmount();
            this.spinner.hide();
          }
        }, (error) => {
          this.spinner.hide();
          this.handleError('Load Data', this.errorGeneralMessage);
        });
      } else {
        //Add empty row 
        this.addBudgetDetail();
      }
    });

    this.loadCustomers();
    this.loadApus();

  }

  loadCustomers() {
    this.spinner.show();
    this.customerService.get().subscribe(customers => {
      this.customers = customers;
      this.spinner.hide();
    }, (error) => {
      console.error('Error al cargar Budget', error);
      this.spinner.hide();
      this.handleError('Load Data', this.errorGeneralMessage);
    });
  }

  loadApus() {
    const storedData = localStorage.getItem(this.localStorageKey);
    const storedExpiry = localStorage.getItem(this.expiryKey);

    const now = new Date().getTime();
    const sixHours = 6 * 60 * 60 * 1000; // Seis horas en milisegundos

    // Verificamos si hay datos almacenados y si no han caducado
    if (storedData && storedExpiry && (now - parseInt(storedExpiry) < sixHours)) {
      console.log('Usando datos de LocalStorage');
      this.apuModels = JSON.parse(storedData);
    } else {
      // Si no hay datos o han caducado, cargamos desde la API
      console.log('Consultando datos de la API');
      this.apuService.get().subscribe(
        apu => {
          this.apuModels = apu;
          // Guardamos los datos en LocalStorage y registramos el timestamp actual
          localStorage.setItem(this.localStorageKey, JSON.stringify(this.apuModels));
          localStorage.setItem(this.expiryKey, now.toString());
        },
        error => {
          console.error('Error al cargar apus', error);
        }
      );
    }
  }

  addBudgetDetail() {
    const budgetDetailGroup = this.fb.group({
      budgetDetailId: [0],
      budgetId: [0],
      unitMeasurement: ['Und'],
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
    this.budgetForm.markAllAsTouched();
    if (this.budgetForm.valid) {
      this.spinner.show();
      this.budgetForm.get('date')?.setValue(this.currentDate);
      this.budgetForm.get('amount')?.setValue(this.amount);
      const formData = this.budgetForm.value;
      console.log(formData);

      if (this.budgetId) {
        this.budgetService.update(formData).subscribe(
          (response: any) => {
            this.router.navigate(['/budgets/budgets']);
            this.spinner.hide();
          },
          (error) => {
            this.showErrors = true;
            this.msjError = error;
            this.spinner.hide();
            this.handleError('Load Data', this.errorGeneralMessage);
          }
        );
      } else {
        this.budgetService.add(formData).subscribe(
          (response: any) => {
            this.router.navigate(['/budgets/budgets']);
            this.spinner.hide();
          },
          (error) => {
            this.showErrors = true;
            this.msjError = "Error inesperado, revisa la información del formulario";
            this.spinner.hide();
            this.handleError('Load Data', this.errorGeneralMessage);
          }
        );
      }
    } else {
      this.showErrors = true;
      this.showModalDefault(true, 'Por favor, completa todos los campos requeridos o verifica que no haya filas vacías antes de continuar.', '¡Campos incompletos!');
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
    const sumAIU = this.budgetForm.get('sumAIU')?.value;
    console.log(sumAIU);
    if (sumAIU) {
      this.total = this.amount + this.iva + this.aiu; // Calculas el total
    } else {
      this.total = this.amount + this.iva; // Calculas el total
    }

  }

  handleLiveDemoChange(event: any) {
    this.visible = event;
  }

  showModal() {
    this.visible = true;
  }

  closeModal() {
    this.visible = false;
  }

  closeModalAPU() {
    this.visible = false;
    this.selectedItems = [];
    this.resetSelections(); // Reseteamos las selecciones al cerrar el modal
  }

  // Método para resetear los ítems seleccionados
  resetSelections() {
    this.apuModels.forEach(item => item.selected = false); // Deseleccionar todos los ítems
  }

  addBudgetDetailFromAPU() {
    // Verificamos si la lista está vacía o nula, o si los datos en localStorage han caducado
    const storedData = localStorage.getItem(this.localStorageKey);
    const storedExpiry = localStorage.getItem(this.expiryKey);

    const now = new Date().getTime();
    const sixHours = 6 * 60 * 60 * 1000; // Seis horas en milisegundos

    const isLocalDataValid = storedData && storedExpiry && (now - parseInt(storedExpiry) < sixHours);

    // Si la lista está vacía o nula, o los datos son inválidos, llamamos a la API
    if (!this.apuModels || this.apuModels.length === 0 || !isLocalDataValid) {
      this.loadApus(); // Cargar datos desde la API si es necesario
    }

    // Mostrar el modal
    this.showModal();
  }


  addToList() {
    this.closeModal();
    this.spinner.show();
    this.selectedItems = this.apuModels.filter(item => item.selected);
    this.closeModal();


    this.selectedItems.forEach(item => {
      const budgetDetailGroup = this.fb.group({
        budgetDetailId: [0],
        budgetId: [0],
        unitMeasurement: [item.unitMeasurement || 'Und'], // Se toma la unidad del item seleccionado o 'Und' por defecto
        description: [item.itemName, [Validators.required]], // Descripción con el nombre del ítem
        quantity: [1, [Validators.required, Validators.pattern(/^\d+$/)]], // Cantidad inicial por defecto en 1
        price: [item.totalPrice, [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]], // Precio del ítem seleccionado
        subtotal: [item.totalPrice], // Subtotal es el precio por defecto
      });

      // Agregar al array de detalles
      this.budgetDetails.push(budgetDetailGroup);
    });

    // Después de agregar los elementos, actualizar el monto total
    this.updateAmount();
    this.spinner.hide();
    this.resetSelections(); // Reseteamos las selecciones al cerrar el modal
  }


  private handleError(consoleMessage: string, modalMessage: string) {
    console.error(consoleMessage);
    this.showModalDefault(true, modalMessage, this.errorTitle);
  }

  showModalDefault(isError: boolean, message: string, title: string) {
    this.confirmationModal.isModalError = isError;
    this.confirmationModal.title = title;
    this.confirmationModal.messageModal = message;
    this.confirmationModal.isConfirmation = false; // Aseguramos que no esté en modo confirmación
    this.confirmationModal.openModal();
  }
  showNotify() {
    console.log('show notify');
  }
}

export function numberGreaterThanZeroValidator(): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } | null => {
    const value = control.value;
   
    // Si el valor es undefined, retornamos un objeto que indica que es inválido
    if (value === undefined || value === null) {     
      return { invalidNumber: true }; // Indica que el valor es inválido
    }

    // Verificar si el valor es un número y mayor que 0
    if (isNaN(value) || value <= 0) {
      return { invalidNumber: true }; // Retorna un objeto de error si no es válido
    }

    return null; // Retorna null si es válido
  }
}
