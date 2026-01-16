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
  private readonly errorDeleteMessage: string = "Hubo un problema al intentar eliminar el producto.";
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
    this.visible = true;
  }

  onModalConfirm(): void {
    if (this.isModalForDelete && this.productToDelete) {
      this.deleteProduct();
    } else {
      this.visible = false;
    }
  }

  onModalCancel(): void {
    this.visible = false;
    this.productToDelete = null;
    this.isModalForDelete = false;
  }

  deleteProduct(): void {
    if (!this.productToDelete) return;

    this.spinner.show();
    this.productService.delete(this.productToDelete.productId).subscribe({
      next: () => {
        this.spinner.hide();
        this.visible = false;
        this.isModalForDelete = false;
        this.showSuccessModal(this.successDeleteTitle, this.successDeleteMessage);
        this.loadProducts();
      },
      error: (error) => {
        console.error('Error deleting product:', error);
        this.spinner.hide();
        this.visible = false;
        this.showErrorModal(this.errorDeleteMessage);
      }
    });
  }

  showSuccessModal(title: string, message: string): void {
    this.isModalError = false;
    this.isModalForDelete = false;
    this.title = title;
    this.messageModal = message;
    this.visible = true;
  }

  showErrorModal(message: string): void {
    this.isModalError = true;
    this.isModalForDelete = false;
    this.title = this.errorTitle;
    this.messageModal = message;
    this.visible = true;
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(price);
  }
}
