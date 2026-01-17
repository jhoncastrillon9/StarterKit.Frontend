import { Component, OnInit, ViewChild } from '@angular/core';
import { Product } from '../models/product.model';
import { ProductService } from '../services/product.service';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { Table } from 'primeng/table';
import { ViewEncapsulation } from '@angular/core';
import { ConfirmationModalComponent } from '../../../shared/components/reusable-modal/reusable-modal.component';

@Component({
  selector: 'app-list-product',
  templateUrl: './list-product.component.html',
  styleUrls: ['./list-product.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ListProductComponent implements OnInit {
  @ViewChild('confirmationModal') confirmationModal!: ConfirmationModalComponent;

  private readonly successDeleteMessage: string = "¡El producto ha sido eliminado correctamente!";
  private readonly successDeleteTitle: string = "¡Eliminación Completada!";
  private readonly successDuplicateMessage: string = "¡El producto ha sido duplicado correctamente!";
  private readonly successDuplicateTitle: string = "¡Producto Duplicado!";
  private readonly errorDeleteMessage: string = "Hubo un problema al intentar eliminar el producto.";
  private readonly errorDuplicateMessage: string = "Hubo un problema al intentar duplicar el producto.";
  private readonly errorTitle: string = "¡Ups! ocurrió un error.";
  private readonly loadDataError: string = "Algo falló al obtener los productos. Refresca la página.";
  private readonly deleteMessage: string = "Una vez eliminado, no hay vuelta atrás... ¿Estás seguro de eliminar este producto?";
  private readonly deleteTitleConfirmation: string = "¿Quieres eliminar este producto?";

  title: string = this.successDeleteTitle;
  messageModal: string = this.successDeleteMessage;
  isModalError: boolean = false;

  searchValue: string = '';
  loading: boolean = true;
  products: Product[] = [];

  isModalForDelete: boolean = false;
  public visible = false;
  public productToDelete: Product | null = null;

  // Paginación
  totalRecords: number = 0;
  currentPage: number = 1;
  pageSize: number = 10;

  constructor(
    private productService: ProductService,
    private router: Router,
    private spinner: NgxSpinnerService
  ) { }

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading = true;
    this.spinner.show();
    
    this.productService.getPaged(this.searchValue, this.currentPage, this.pageSize).subscribe({
      next: (response) => {
        this.products = response.items;
        this.totalRecords = response.total;
        this.loading = false;
        this.spinner.hide();
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.loading = false;
        this.spinner.hide();
        this.showErrorModal(this.loadDataError);
      }
    });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadProducts();
  }

  onPageChange(event: any): void {
    this.currentPage = Math.floor(event.first / event.rows) + 1;
    this.pageSize = event.rows;
    this.loadProducts();
  }

  clear(table: Table): void {
    this.searchValue = '';
    table.clear();
    this.loadProducts();
  }

  goToAdd(): void {
    this.router.navigate(['/products/add']);
  }

  goToEdit(product: Product): void {
    this.router.navigate(['/products/update', product.productId]);
  }

  confirmDelete(product: Product): void {
    this.productToDelete = product;
    this.isModalForDelete = true;
    this.isModalError = false;
    this.title = this.deleteTitleConfirmation;
    this.messageModal = this.deleteMessage;
    // Asignar valores directamente al modal antes de abrirlo
    setTimeout(() => {
      this.confirmationModal.title = this.deleteTitleConfirmation;
      this.confirmationModal.messageModal = this.deleteMessage;
      this.confirmationModal.isModalError = false;
      this.confirmationModal.isConfirmation = true;
      this.confirmationModal.titleButtonComfimationYes = 'Eliminar';
      this.confirmationModal.openModal();
    }, 0);
  }

  onModalConfirm(): void {
    if (this.isModalForDelete && this.productToDelete) {
      this.deleteProduct();
    }
  }

  onModalCancel(): void {
    this.productToDelete = null;
    this.isModalForDelete = false;
  }

  deleteProduct(): void {
    if (!this.productToDelete) return;

    this.spinner.show();
    this.productService.delete(this.productToDelete.productId).subscribe({
      next: () => {
        this.spinner.hide();
        this.productToDelete = null;
        this.isModalForDelete = false;
        this.clearProductCache();
        this.showSuccessModal(this.successDeleteTitle, this.successDeleteMessage);
        this.loadProducts();
      },
      error: (error) => {
        console.error('Error deleting product:', error);
        this.spinner.hide();
        this.showErrorModal(this.errorDeleteMessage);
      }
    });
  }

  showSuccessModal(title: string, message: string): void {
    this.isModalError = false;
    this.isModalForDelete = false;
    this.title = title;
    this.messageModal = message;
    // Usar setTimeout para asegurar que Angular detecte los cambios antes de abrir el modal
    setTimeout(() => {
      this.confirmationModal.title = title;
      this.confirmationModal.messageModal = message;
      this.confirmationModal.isModalError = false;
      this.confirmationModal.isConfirmation = false;
      this.confirmationModal.openModal();
    }, 0);
  }

  showErrorModal(message: string): void {
    this.isModalError = true;
    this.isModalForDelete = false;
    this.title = this.errorTitle;
    this.messageModal = message;
    // Usar setTimeout para asegurar que Angular detecte los cambios antes de abrir el modal
    setTimeout(() => {
      this.confirmationModal.title = this.errorTitle;
      this.confirmationModal.messageModal = message;
      this.confirmationModal.isModalError = true;
      this.confirmationModal.isConfirmation = false;
      this.confirmationModal.openModal();
    }, 0);
  }

  duplicateProduct(product: Product): void {
    this.spinner.show();
    
    const duplicatedProduct: Product = {
      productId: 0,
      name: product.name + ' (Copia)',
      description: product.description,
      price: product.price,
      productInternalCode: product.productInternalCode + '-COPY',
      unitMeasurement: product.unitMeasurement || 'Und'
    };

    this.productService.add(duplicatedProduct).subscribe({
      next: () => {
        this.spinner.hide();
        this.clearProductCache();
        this.showSuccessModal(this.successDuplicateTitle, this.successDuplicateMessage);
        this.loadProducts();
      },
      error: (error) => {
        console.error('Error duplicating product:', error);
        this.spinner.hide();
        this.showErrorModal(this.errorDuplicateMessage);
      }
    });
  }

  clearProductCache(): void {
    localStorage.removeItem('productModelsData');
    localStorage.removeItem('productModelsExpiry');
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(price);
  }
}
