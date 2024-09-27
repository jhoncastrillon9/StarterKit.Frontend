import {BudgetModel} from './budget.Model';

export class SendBudgetPdfRequest {
    budgetId: number;
    emails: string[];    

    constructor(budget: BudgetModel) {
      this.budgetId = budget.budgetId;  
      this.emails = this.extractEmails(budget.customerDto.email); 
    }
  
    
    private extractEmails(emailString: string): string[] {
      if (!emailString) {
        return [];
      }
      return emailString.split(',').map(email => email.trim());  
    }
  }
  