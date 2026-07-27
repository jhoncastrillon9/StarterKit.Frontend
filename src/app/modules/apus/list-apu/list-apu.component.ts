import { Component, OnInit, ViewChild } from '@angular/core';
import { ApuService } from '../services/apu.service';
import { ApuModel } from '../models/apu.Model';
import { cilEnvelopeOpen, flagSet } from '@coreui/icons';
import { IconModule, IconSetService } from '@coreui/icons-angular';
import { cilPencil, cilXCircle, cilZoom, cilCloudDownload, cilNoteAdd, cilMoney} from '@coreui/icons';
import { Router, RouterModule } from '@angular/router';
import { Table, TableModule} from 'primeng/table';
import { ViewEncapsulation } from '@angular/core';
import { SharedModule } from '../../../shared.module';
import { CommonModule } from '@angular/common';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { ButtonGroupModule, ButtonModule, CardModule, DropdownModule, FormModule, GridModule, ListGroupModule, ModalModule } from '@coreui/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { StyleClassModule } from 'primeng/styleclass';
import { InputMaskModule } from 'primeng/inputmask';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputOtpModule } from 'primeng/inputotp';
import { ButtonModule as PrimeButtonModule }  from 'primeng/button';
import { CustomSharedModule} from '../../../shared/shared.module';
import { ConfirmationModalComponent } from 'src/app/shared/components/reusable-modal/reusable-modal.component';
import { DataTableComponent } from 'src/app/shared/ui/data-table/data-table.component';
import { DataTableColumnDirective } from 'src/app/shared/ui/data-table/data-table-column.directive';
import { DataTableColumn, KpiDef } from 'src/app/shared/ui/data-table/data-table.types';


@Component({
  selector: 'app-list-apu',
  standalone: true,
  imports: [    SharedModule,     CommonModule,         RouterModule,     NgxSpinnerModule,         CardModule,     FormModule,     GridModule,     FormsModule,     ButtonModule,     ReactiveFormsModule,     FormModule,
     PrimeButtonModule,     DropdownModule,    SharedModule,    ListGroupModule,    IconModule,    ModalModule,    TableModule,    InputTextModule,    InputIconModule,    IconFieldModule,    StyleClassModule,    InputMaskModule,
    InputSwitchModule,    InputNumberModule,    InputTextareaModule,    InputGroupAddonModule,    InputGroupModule,    InputOtpModule, CustomSharedModule,
    DataTableComponent, DataTableColumnDirective
    ],
  templateUrl: './list-apu.component.html',
  styleUrl: './list-apu.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class ListApuComponent {
  @ViewChild('confirmationModal') confirmationModal!: ConfirmationModalComponent;
  isModalError: boolean = false;
  searchValue: string | undefined;
  loading: boolean = true;
  apus: ApuModel[] = [];

  tableColumns: DataTableColumn[] = [
    { field: 'unitPriceAnalysisId', header: 'Cod', sortable: true, width: '80px' },
    { field: 'subChapterName', header: 'Capítulo', sortable: true },
    { field: 'itemName', header: 'Item', sortable: true },
    { field: 'unitMeasurement', header: 'Und', sortable: true, width: '100px' },
    { field: 'laborCost', header: 'Mano de Obra', sortable: true, align: 'right', width: '150px' },
    { field: 'totalPrice', header: 'Valor Total', sortable: true, align: 'right', width: '150px' },
  ];

  get sumTotal(): number {
    return this.apus.reduce((s, a) => s + (a.totalPrice ?? 0), 0);
  }

  get kpis(): KpiDef[] {
    return [
      { key: 'count', label: 'Total APUs', value: this.apus.length, dotColor: '#6d28d9' },
      { key: 'sum', label: 'Suma valor total', value: '$ ' + this.sumTotal.toLocaleString('es-ES', { maximumFractionDigits: 0 }), dotColor: '#1aa35c' },
    ];
  }

  private readonly errorTitle: string = "Oops, ocurrió un error.";
  private readonly loadDataErrorMessage: string = "Algo falló al obtener los datos del APU. Refresca la página.";
  title: string = this.errorTitle;
  messageModal: string = this.loadDataErrorMessage;

  constructor(private apuService: ApuService,
    public iconSet: IconSetService,  
    private router: Router,
    private spinner: NgxSpinnerService) {
    iconSet.icons = {  cilPencil,cilXCircle,  cilZoom, cilCloudDownload, cilNoteAdd, cilMoney };
  }


  ngOnInit() {
    this.loadApus();
  }

  loadApus(){
    this.spinner.show();
    this.apuService.get().subscribe(apus => {
      this.apus = apus;
      this.loading =false;
    },
    (error) => {
      this.spinner.hide();
      this.handleError('Error al cargar apu', this.loadDataErrorMessage);
    });
  }

  clear(table: Table) {
    table.clear();
    this.searchValue = ''
}


private handleError(consoleMessage: string, modalMessage: string) {
  console.error(consoleMessage);
  this.showModal(true, modalMessage, this.errorTitle);
}

showModal(isError: boolean, message: string, title: string) {
  this.confirmationModal.isModalError = isError;
  this.confirmationModal.title = title;
  this.confirmationModal.messageModal = message;
  this.confirmationModal.isConfirmation = false; // Aseguramos que no esté en modo confirmación
  this.confirmationModal.openModal();
}

}
