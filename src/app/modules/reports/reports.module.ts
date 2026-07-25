import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportsRoutingModule } from './reports-routing.module';
import { AccountStatementComponent } from './account-statement/account-statement.component';
import { FormsModule } from '@angular/forms';
import { GridModule, BadgeModule } from '@coreui/angular';
import { NgxSpinnerModule } from 'ngx-spinner';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { TooltipModule } from 'primeng/tooltip';
import { CustomSharedModule } from 'src/app/shared/shared.module';
import { DataTableComponent } from 'src/app/shared/ui/data-table/data-table.component';
import { DataTableColumnDirective } from 'src/app/shared/ui/data-table/data-table-column.directive';
import { StatusPillComponent } from 'src/app/shared/ui/status-pill/status-pill.component';

@NgModule({
  declarations: [AccountStatementComponent],
  imports: [
    CommonModule,
    ReportsRoutingModule,
    FormsModule,
    GridModule,
    BadgeModule,
    NgxSpinnerModule,
    OverlayPanelModule,
    TooltipModule,
    CustomSharedModule,
    DataTableComponent,
    DataTableColumnDirective,
    StatusPillComponent,
  ]
})
export class ReportsModule { } 