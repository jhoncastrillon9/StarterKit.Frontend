import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { Product } from '../models/product.model';
import { ProductService } from '../services/product.service';

@Component({
  selector: 'app-add-update-product',
  templateUrl: './add-update-product.component.html',
  styleUrls: ['./add-update-product.component.scss']
})
export class AddUpdateProductComponent implements OnInit {
  productForm!: FormGroup;
  isEditMode: boolean = false;
  productId: number | null = null;
  pageTitle: string = 'Nuevo Producto';

  // Modal
  visible: boolean = false;
  modalTitle: string = '';
  modalMessage: string = '';
  isModalError: boolean = false;

  private readonly successAddMessage: string = '¡El producto ha sido creado correctamente!';
  private readonly successAddTitle: string = '¡Producto Creado!';
  private readonly successUpdateMessage: string = '¡El producto ha sido actualizado correctamente!';
  private readonly successUpdateTitle: string = '¡Producto Actualizado!';
  private readonly errorTitle: string = '¡Ups! ocurrió un error.';
  private readonly errorMessage: string = 'Hubo un problema al guardar el producto. Por favor, intenta de nuevo.';
  private readonly loadDataError: string = 'No se pudo cargar la información del producto.';

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private router: Router,
    private route: ActivatedRoute,
    private spinner: NgxSpinnerService
  ) { }

  ngOnInit(): void {
    this.initForm();
    this.checkEditMode();
  }

  initForm(): void {
    this.productForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(200)]],
      description: ['', [Validators.maxLength(500)]],
      price: [0, [Validators.required, Validators.min(0)]],
      productInternalCode: ['', [Validators.required, Validators.maxLength(50)]]
    });
  }

  checkEditMode(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.productId = +id;
      this.pageTitle = 'Editar Producto';
      this.loadProduct();
    }
  }

  loadProduct(): void {
    if (!this.productId) return;

    this.spinner.show();
    this.productService.getById(this.productId).subscribe({
      next: (product: Product) => {
        this.productForm.patchValue({
          name: product.name,
          description: product.description,
          price: product.price,
          productInternalCode: product.productInternalCode
        });
        this.spinner.hide();
      },
      error: (error) => {
        console.error('Error loading product:', error);
        this.spinner.hide();
        this.showErrorModal(this.loadDataError);
      }
    });
  }

  onSubmit(): void {
    if (this.productForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.spinner.show();

    const productData: Product = {
      productId: this.productId || 0,
      name: this.productForm.value.name,
      description: this.productForm.value.description || '',
      price: this.productForm.value.price,
      productInternalCode: this.productForm.value.productInternalCode
    };

    if (this.isEditMode && this.productId) {
      this.updateProduct(productData);
    } else {
      this.addProduct(productData);
    }
  }

  addProduct(product: Product): void {
    this.productService.add(product).subscribe({
      next: () => {
        this.spinner.hide();
        this.showSuccessModal(this.successAddTitle, this.successAddMessage);
      },
      error: (error) => {
        console.error('Error adding product:', error);
        this.spinner.hide();
        this.showErrorModal(this.errorMessage);
      }
    });
  }

  updateProduct(product: Product): void {
    if (!this.productId) return;

    this.productService.update(this.productId, product).subscribe({
      next: () => {
        this.spinner.hide();
        this.showSuccessModal(this.successUpdateTitle, this.successUpdateMessage);
      },
      error: (error) => {
        console.error('Error updating product:', error);
        this.spinner.hide();
        this.showErrorModal(this.errorMessage);
      }
    });
  }

  markFormGroupTouched(): void {
    Object.keys(this.productForm.controls).forEach(key => {
      this.productForm.get(key)?.markAsTouched();
    });
  }

  showSuccessModal(title: string, message: string): void {
    this.isModalError = false;
    this.modalTitle = title;
    this.modalMessage = message;
    this.visible = true;
  }

  showErrorModal(message: string): void {
    this.isModalError = true;
    this.modalTitle = this.errorTitle;
    this.modalMessage = message;
    this.visible = true;
  }

  onModalConfirm(): void {
    this.visible = false;
    if (!this.isModalError) {
      this.router.navigate(['/products']);
    }
  }

  onCancel(): void {
    this.router.navigate(['/products']);
  }

  // Getters para validación
  get nameInvalid(): boolean {
    const control = this.productForm.get('name');
    return control ? control.invalid && control.touched : false;
  }

  get priceInvalid(): boolean {
    const control = this.productForm.get('price');
    return control ? control.invalid && control.touched : false;
  }

  get productInternalCodeInvalid(): boolean {
    const control = this.productForm.get('productInternalCode');
    return control ? control.invalid && control.touched : false;
  }
}
