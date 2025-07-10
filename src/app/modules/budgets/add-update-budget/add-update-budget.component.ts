import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, ValidatorFn, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BudgetService } from '../services/budget.service';
import { CustomerModel } from '../../customers/models/customer.Model';
import { CustomerService } from '../../customers/services/customer.service';
import { cilPencil, cilXCircle, cilMoney, cilSpeech, cilMediaPlay } from '@coreui/icons';
import { IconSetService } from '@coreui/icons-angular';
import { NgxSpinnerService } from 'ngx-spinner';
import { ApuModel } from '../../apus/models/apu.Model';
import { ApuService } from '../../apus/services/apu.service';
import { ConfirmationModalComponent } from 'src/app/shared/components/reusable-modal/reusable-modal.component';
import { color } from 'html2canvas/dist/types/css/types/color';
import Fuse from 'fuse.js';


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

  wayToPayDefault: string = "70% Para iniciar la obra, 20% en el transcurso de la obra y 10% Al finalizar Obra";
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

  // Propiedades para grabación de audio
  isRecording: boolean = false;
  mediaRecorder: MediaRecorder | null = null;
  audioChunks: Blob[] = [];

  equivalencias: { [key: string]: string[] } = {
    adobe: ['muro', 'ladrillo', 'bloque'],
    muro: ['adobe', 'ladrillo', 'bloque'],
    bloque: ['ladrillo', 'muro', 'adobe'],
    ladrillo: ['bloque', 'muro', 'adobe'],
    drywall: ['dry wall', ' drywall', 'driwall'],
    driwall: ['dry wall', ' drywall', 'driwall'],
    draiwall: ['dry wall', ' drywall', 'driwall'],
    draywall: ['dry wall', ' drywall', 'driwall'],
    techo: ['tejado', ' teja'],
  };

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
      externalInvoice: ['0'],
      userId: ['0', [Validators.required]],
      customerId: ['', [Validators.required, numberGreaterThanZeroValidator()]],
      amount: [this.amount, [Validators.required]],
      date: [new Date()],
      budgetName: ['', [Validators.required]],
      wayToPay: [this.wayToPayDefault],
      deliveryTime: [this.deliveryTimeDefault],
      validityOffer: [this.validityOfferDefault],
      note: [''],
      estado: [''],
      projectReportId: [0],
      hasIVA: [true],
      hasAIU: [false],
      sumAIU: [false],
      budgetDetailsDto: this.fb.array([])
    });

    iconSet.icons = { cilPencil, cilXCircle, cilMoney, cilSpeech, cilMediaPlay };

  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.budgetId = params.get('id')!;
      this.spinner.show();
      if (this.budgetId) {
        this.titlePage = "Editar cotización";
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
      console.log('Using LocalStorage for Apu');
      this.apuModels = JSON.parse(storedData);
    } else {
      // Si no hay datos o han caducado, cargamos desde la API
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
      this.budgetForm.get('amount')?.setValue(this.amount);
      // Solo actualizar la fecha si es una nueva cotización
      if (!this.budgetId) {
        this.budgetForm.get('date')?.setValue(this.currentDate);
      }
      const formData = this.budgetForm.value;
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

  updateCheckStatusIVA() {

    this.updateAmount();
  }


  updateCheckStatusAIU() {
    const aiu = this.budgetForm.get('hasAIU')?.value;
    // Controla el estado de 'sumAIU' basado en 'AIU'
    if (aiu === true) {
      this.budgetForm.get('sumAIU')?.enable();
      this.budgetForm.get('sumAIU')?.setValue(true);
    } else {
      this.budgetForm.get('sumAIU')?.disable();
      this.budgetForm.get('sumAIU')?.setValue(false);
    }

    this.updateAmount();
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
    const { hasIVA: ivaValue = 0, hasAIU: aiuValue = 0, sumAIU = false } = this.budgetForm.value; // Obtenemos valores con default 0
    const aiuPercentage = 0.1;
    const ivaPercentage = 0.19;
  
    // Calcula el AIU solo si tiene valor, si no, será 0
    this.aiu = aiuValue ? this.amount * aiuPercentage : 0;
  
    // Si existe valor en IVA, calcula el IVA en base al AIU o al monto total
    this.iva = ivaValue ? (aiuValue ? this.aiu * ivaPercentage : this.amount * ivaPercentage) : 0;
  
    // Suma total dependiendo si sumAIU es verdadero o no
    this.total = this.amount + this.iva + (sumAIU ? this.aiu : 0);
  }

  
  handleLiveDemoChange(event: any) {
    this.visible = event;
    console.log('Abremo dal apu : '+ event);
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
    this.searchTerm='';
    this.apuModels.forEach(item => item.selected = false); // Deseleccionar todos los ítems
  }

  get filteredApuModels() {
    if (!this.searchTerm) {
      return this.apuModels;
    }
  
    // Crear un conjunto de términos de búsqueda que incluya sinónimos
    const searchTerms = [this.searchTerm.toLowerCase()];
  
    // Agregar sinónimos si existen
    if (this.equivalencias[this.searchTerm.toLowerCase()]) {
      searchTerms.push(...this.equivalencias[this.searchTerm.toLowerCase()]);
    }
  
    // Configuración de opciones para Fuse.js
    const options = {
      keys: ['itemName'],
      includeScore: true,
      threshold: 0.3,
    };
  
    // Crear una instancia de Fuse con los modelos y opciones
    const fuse = new Fuse(this.apuModels, options);
  
    // Realizar la búsqueda para cada término de búsqueda
    const resultados = searchTerms.flatMap(term => fuse.search(term));
  
    // Devolver solo los elementos encontrados (sin duplicados)
    const uniqueResults = new Set(resultados.map(result => result.item));
    return Array.from(uniqueResults);
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
    // Implementación del método showNotify si es necesario
  }

  // Métodos para grabación de audio
  async toggleRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Priorizar mp4/m4a que es más compatible con el backend
      let mimeType = 'audio/mp4';
      if (!MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/webm;codecs=opus';
      }
      
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType
      });
      
      this.audioChunks = [];
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.processRecording();
        stream.getTracks().forEach(track => track.stop());
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('Error en grabación:', event);
        this.isRecording = false;
        this.handleError('Grabación', 'Error durante la grabación de audio.');
      };

      this.mediaRecorder.start();
      this.isRecording = true;
    } catch (error) {
      console.error('Error al iniciar la grabación:', error);
      this.handleError('Grabación', 'No se pudo acceder al micrófono. Verifica los permisos.');
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
    }
  }

  async processRecording() {
    if (this.audioChunks.length === 0) {
      this.handleError('Grabación', 'No se pudo grabar audio.');
      return;
    }

    // Determinar el tipo MIME y extensión del archivo
    let mimeType = 'audio/mp4';
    let fileExtension = 'm4a';
    
    if (this.mediaRecorder && this.mediaRecorder.mimeType) {
      mimeType = this.mediaRecorder.mimeType;
      if (mimeType.includes('mp4')) {
        fileExtension = 'm4a';
      } else if (mimeType.includes('webm')) {
        // Si el backend no acepta webm, intentar con mp3
        fileExtension = 'mp3';
      }
    }

    const audioBlob = new Blob(this.audioChunks, { type: mimeType });
    await this.sendAudioToBackend(audioBlob, fileExtension);
  }

  async sendAudioToBackend(audioBlob: Blob, fileExtension: string) {
    this.spinner.show();
    
    try {
      const formData = new FormData();
      formData.append('audioFile', audioBlob, `recording.${fileExtension}`);

      // Llamar al servicio para enviar el audio
      this.budgetService.sendAudioToDetails(formData).subscribe({
        next: (response: any) => {
          this.spinner.hide();
          this.addDetailsFromAudio(response);
          this.showModalDefault(false, 'Detalles agregados correctamente desde el audio.', 'Éxito');
        },
        error: (error: any) => {
          this.spinner.hide();
          console.error('Error al procesar audio:', error);
          this.handleError('Procesamiento de Audio', 'No se pudo procesar el audio. Intenta de nuevo.');
        }
      });
    } catch (error) {
      this.spinner.hide();
      console.error('Error al enviar audio:', error);
      this.handleError('Envío de Audio', 'Error al enviar el audio al servidor.');
    }
  }

  addDetailsFromAudio(details: any[]) {
    if (!details || details.length === 0) {
      return;
    }

    details.forEach(detail => {
      const budgetDetailGroup = this.fb.group({
        budgetDetailId: [detail.budgetDetailId || 0],
        budgetId: [detail.budgetId || 0],
        description: [detail.description || '', [Validators.required]],
        unitMeasurement: [detail.unitMeasurement || 'Und'],
        quantity: [detail.quantity || 0, [Validators.required, Validators.pattern(/^\d+$/)]],
        price: [detail.price || 0, [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
        subtotal: [detail.total || 0],
      });
      
      this.budgetDetails.push(budgetDetailGroup);
    });

    this.updateAmount();
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
