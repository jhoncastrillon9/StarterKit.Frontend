import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { BudgetService } from '../../budgets/services/budget.service';
import { CustomerService } from '../../customers/services/customer.service';
import { CompanyService } from '../../configurations/services/company.service';
import { BudgetModel } from '../../budgets/models/budget.Model';
import { CustomerModel } from '../../customers/models/customer.Model';
import { NgxSpinnerService } from 'ngx-spinner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BUDGET_ESTADOS } from '../../../shared/constants';

@Component({
  selector: 'app-account-statement',
  templateUrl: './account-statement.component.html',
  styleUrls: ['./account-statement.component.scss']
})
export class AccountStatementComponent implements OnInit {
  private budgetService = inject(BudgetService);
  private customerService = inject(CustomerService);
  private companyService = inject(CompanyService);
  private spinner = inject(NgxSpinnerService);

  customers = signal<CustomerModel[]>([]);
  budgets = signal<BudgetModel[]>([]);
  selectedCustomer = signal<CustomerModel | null>(null);
  companyInfo = signal<any>(null);

  filteredBudgets = computed(() => {
    if (!this.selectedCustomer()) return [];
    return this.budgets().filter(budget =>
      budget.customerId === this.selectedCustomer()?.customerId &&
      budget.externalInvoice && budget.externalInvoice !== '0' && budget.externalInvoice !== '' &&
      (
        !budget.estado 
        || budget.estado.toLowerCase() === 'Aprobada' 
        || budget.estado.toLowerCase() === 'En Desarrollo'
        || budget.estado.toLowerCase() === 'Finalizado'
        || budget.estado.toLowerCase() === 'Facturada'
        || budget.estado.toLowerCase() === 'Pagada'
      )
    );
  });

  total = computed(() =>
    this.filteredBudgets().reduce((sum, b) => sum + (b.total ?? 0), 0)
  );

  estadoOptions = BUDGET_ESTADOS;

  editedBudgets = new Map<number, { externalInvoice?: string, estado?: string }>();

  ngOnInit(): void {
    this.loadCustomers();
    this.loadBudgets();
    this.loadCompanyInfo();
  }

  onFacturaChange(budgetId: number, value: string) {
    const current = this.editedBudgets.get(budgetId) || {};
    this.editedBudgets.set(budgetId, { ...current, externalInvoice: value });
  }

  onEstadoChange(budgetId: number, value: string) {
    const current = this.editedBudgets.get(budgetId) || {};
    this.editedBudgets.set(budgetId, { ...current, estado: value });
  }

  saveBudget(budget: BudgetModel) {
    const changes = this.editedBudgets.get(budget.budgetId);
    if (!changes) return;

    const updatedBudget = { ...budget, ...changes };
    
    this.spinner.show();
    this.budgetService.update(updatedBudget).subscribe({
      next: () => {
        // Update local state
        const budgetsList = this.budgets();
        const index = budgetsList.findIndex(b => b.budgetId === budget.budgetId);
        if (index !== -1) {
          budgetsList[index] = updatedBudget;
          this.budgets.set([...budgetsList]);
        }
        this.editedBudgets.delete(budget.budgetId);
        this.spinner.hide();
        alert('Cambios guardados correctamente');
      },
      error: (err) => {
        console.error('Error al guardar:', err);
        this.spinner.hide();
        alert('Error al guardar los cambios');
      }
    });
  }

  hasChanges(budgetId: number): boolean {
    return this.editedBudgets.has(budgetId);
  }

  loadCustomers() {
    this.customerService.get().subscribe((res: any) => {
      this.customers.set(res);
    });
  }

  loadBudgets() {
    this.budgetService.get().subscribe((res: any) => {
      this.budgets.set(res);
    });
  }

  loadCompanyInfo() {
    this.companyService.getCompanyByUser().subscribe((res: any) => {
      this.companyInfo.set(res);
    });
  }

  onCustomerChange(customerId: string) {
    if (!customerId) {
      this.selectedCustomer.set(null);
      return;
    }
    const customer = this.customers().find(c => c.customerId === +customerId) ?? null;
    this.selectedCustomer.set(customer);
  }

  onCustomerSelectChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.onCustomerChange(value);
  }

  async generarPDF() {
    this.spinner.show();
    
    try {
      const cliente = this.selectedCustomer();
      const empresa = this.companyInfo();
      
      if (!empresa) {
        console.error('No se pudo obtener la información de la empresa');
        this.spinner.hide();
        return;
      }

      const doc = new jsPDF();
      
      // Cargar logo como base64 si existe
      if (empresa.urlImageLogo) {
        try {
          const logoBase64 = await this.getBase64ImageFromURL(empresa.urlImageLogo);
          doc.addImage(logoBase64, 'PNG', 10, 10, 40, 20);
        } catch (e) {
          console.warn('No se pudo cargar el logo de la empresa');
        }
      }
      
      // Datos empresa
      doc.setFontSize(12);
      doc.text(empresa.companyName || 'Empresa', 55, 15);
      doc.text(empresa.address || '', 55, 22);
      doc.text(empresa.telephones || '', 55, 29);
      doc.text(empresa.email || '', 55, 36);
      
      // Datos cliente
      doc.setFontSize(11);
      doc.text('Cliente:', 10, 45);
      doc.text(cliente?.customerName ?? '', 30, 45);
      doc.text('Email:', 10, 52);
      doc.text(cliente?.email ?? '', 30, 52);
      doc.text('Dirección:', 10, 59);
      doc.text(cliente?.address ?? '', 30, 59);
      
      // Total adeudado
      doc.setFontSize(12);
      doc.text(`Total adeudado: $${this.total().toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, 10, 66);
      
      // Tabla
      const body = this.filteredBudgets().map(budget => [
        budget.internalCode,
        new Date(budget.date).toLocaleDateString(),
        budget.budgetName,
        budget.externalInvoice,
        budget.estado || 'Pendiente',
        `$${budget.total.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
      ]);
      
      let finalY = 80 + body.length * 10;
      try {
        autoTable(doc, {
          head: [[
            'Código', 'Fecha', 'Nombre de la obra', 'Factura', 'Estado', 'Total'
          ]],
          body,
          startY: 80,
          theme: 'grid',
          headStyles: { fillColor: [102, 16, 242] },
          styles: { fontSize: 10 }
        });
        // No se puede usar tableResult porque autoTable retorna void
      } catch (e) {
        // Si autoTable falla, el PDF igual se genera sin tabla
      }
      
      // Total
      doc.setFontSize(12);
      doc.text(`Total: $${this.total().toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, 150, finalY + 10);
      doc.save(`estado-cuenta-${cliente?.customerName ?? 'cliente'}.pdf`);
    } catch (error) {
      console.error('Error al generar PDF:', error);
    } finally {
      this.spinner.hide();
    }
  }

  private getBase64ImageFromURL(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.setAttribute('crossOrigin', 'anonymous');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = (error) => {
        console.warn('No se pudo cargar el logo desde:', url);
        console.warn('Error CORS probable. Configura CORS en Azure Blob Storage.');
        // Resolver con una imagen por defecto o rechazar
        reject(error);
      };
      img.src = url;
    });
  }
} 