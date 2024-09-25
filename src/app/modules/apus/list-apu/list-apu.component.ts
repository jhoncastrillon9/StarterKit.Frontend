import { Component, OnInit } from '@angular/core';
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
import { NgxSpinnerModule } from 'ngx-spinner';
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


@Component({
  selector: 'app-list-apu',
  standalone: true,
  imports: [

     CommonModule,    
     RouterModule,
     NgxSpinnerModule,    
     CardModule,
     FormModule,
     GridModule,
     FormsModule,
     ButtonModule,
     ReactiveFormsModule,
     FormModule,
     PrimeButtonModule,
    // ButtonGroupModule,
     DropdownModule,
    SharedModule,
    ListGroupModule,
    IconModule,
    ModalModule,
    TableModule,
    InputTextModule,
    InputIconModule,
    IconFieldModule,
    StyleClassModule,
    InputMaskModule,
    InputSwitchModule,
    InputNumberModule,
    InputTextareaModule,
    InputGroupAddonModule,
    InputGroupModule,
    InputOtpModule,
    ],
  templateUrl: './list-apu.component.html',
  styleUrl: './list-apu.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class ListApuComponent {
  searchValue: string | undefined;
  loading: boolean = true;
  apus: ApuModel[] = [];
  constructor(private apuService: ApuService,public iconSet: IconSetService,  private router: Router) {
    iconSet.icons = {  cilPencil,cilXCircle,  cilZoom, cilCloudDownload, cilNoteAdd, cilMoney };
  }


  ngOnInit() {
    this.loadApus();
  }

  loadApus(){
    console.log('Hola testttt');
    this.apuService.get().subscribe(apus => {
      this.apus = apus;
      this.loading =false;
    });
  }

  clear(table: Table) {
    table.clear();
    this.searchValue = ''
}


}
