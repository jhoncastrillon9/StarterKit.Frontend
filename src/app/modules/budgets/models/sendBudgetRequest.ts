import {BudgetModel} from './budget.Model';

export class SendBudgetPdfRequest {
    budgetId: number;
    emails: string[];    

    constructor(budget: BudgetModel, selectedEmails?: string[]) {
      this.budgetId = budget.budgetId;  
      // Si se proporcionan emails seleccionados, usarlos; sino, extraer del cliente
      if (selectedEmails && selectedEmails.length > 0) {
        this.emails = selectedEmails;
      } else {
        this.emails = this.extractEmails(budget.customerDto.email); 
      }
    } 
    
    private extractEmails(emailString: string): string[] {
      if (!emailString) {
        return [];
      }
      // Soportar tanto , como ; como separadores
      return emailString.split(/[;,]/).map(email => email.trim()).filter(email => email.length > 0);  
    }
  }
  