import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { ListInvoiceComponent } from './list-invoice/list-invoice.component';
import { EditInvoiceComponent } from './edit-invoice/edit-invoice.component';
import { InvoicesRoutingModule } from './invoices-routing.module';

import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

import { CustomSharedModule } from '../../shared/shared.module';
import { DataTableComponent } from 'src/app/shared/ui/data-table/data-table.component';
import { DataTableColumnDirective } from 'src/app/shared/ui/data-table/data-table-column.directive';
import { StatusPillComponent } from 'src/app/shared/ui/status-pill/status-pill.component';

@NgModule({
  declarations: [
    ListInvoiceComponent,
    EditInvoiceComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    InvoicesRoutingModule,
    TableModule,
    ToastModule,
    TooltipModule,
    CustomSharedModule,
    DataTableComponent,
    DataTableColumnDirective,
    StatusPillComponent,
  ],
  providers: [MessageService]
})
export class InvoicesModule { }
