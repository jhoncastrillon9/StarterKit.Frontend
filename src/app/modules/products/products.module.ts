import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Routing
import { ProductsRoutingModule } from './products-routing.module';

// Components
import { ListProductComponent } from './list-product/list-product.component';
import { AddUpdateProductComponent } from './add-update-product/add-update-product.component';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { DialogModule } from 'primeng/dialog';

// Other Modules
import { NgxSpinnerModule } from 'ngx-spinner';
import { CustomSharedModule } from 'src/app/shared/shared.module';
import { DataTableComponent } from 'src/app/shared/ui/data-table/data-table.component';
import { DataTableColumnDirective } from 'src/app/shared/ui/data-table/data-table-column.directive';

@NgModule({
  declarations: [
    ListProductComponent,
    AddUpdateProductComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ProductsRoutingModule,
    TableModule,
    InputTextModule,
    ButtonModule,
    TooltipModule,
    InputNumberModule,
    InputTextareaModule,
    DialogModule,
    NgxSpinnerModule,
    CustomSharedModule,
    RouterModule,
    DataTableComponent,
    DataTableColumnDirective,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ProductsModule { }
