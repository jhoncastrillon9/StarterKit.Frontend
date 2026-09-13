import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportsRoutingModule } from './reports-routing.module';
import { AccountStatementComponent } from './account-statement/account-statement.component';
import { FormsModule } from '@angular/forms';
import { GridModule, BadgeModule } from '@coreui/angular';
import { NgxSpinnerModule } from 'ngx-spinner';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CustomSharedModule } from 'src/app/shared/shared.module';
import { DataTableComponent } from 'src/app/shared/ui/data-table/data-table.component';
import { DataTableColumnDirective } from 'src/app/shared/ui/data-table/data-table-column.directive';
import { StatusPillComponent } from 'src/app/shared/ui/status-pill/status-pill.component';
import { KpiCardComponent } from 'src/app/shared/ui/kpi-card/kpi-card.component';
import { ClientAvatarComponent } from 'src/app/shared/ui/client-avatar/client-avatar.component';
import { ChartjsModule } from '@coreui/angular-chartjs';
import { PortfolioDashboardComponent } from './account-statement/portfolio-dashboard/portfolio-dashboard.component';

@NgModule({
  declarations: [AccountStatementComponent, PortfolioDashboardComponent],
  imports: [
    CommonModule,
    ReportsRoutingModule,
    FormsModule,
    GridModule,
    BadgeModule,
    NgxSpinnerModule,
    OverlayPanelModule,
    DialogModule,
    TooltipModule,
    ToastModule,
    CustomSharedModule,
    DataTableComponent,
    DataTableColumnDirective,
    StatusPillComponent,
    KpiCardComponent,
    ClientAvatarComponent,
    ChartjsModule,
  ],
  exports: [PortfolioDashboardComponent],
  providers: [MessageService]
})
export class ReportsModule { } 