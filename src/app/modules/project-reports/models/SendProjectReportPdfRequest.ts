import { ProjectReportModel } from "./projectReport.Model";

export class SendProjectReportPdfRequest {
    budgetId: number;
    emails: string[];    

    constructor(report: ProjectReportModel) {
      this.budgetId = report.budgetId;  
      this.emails = this.extractEmails(report.customerEmail); 
    } 
    
    private extractEmails(emailString: string): string[] {
      if (!emailString) {
        return [];
      }
      return emailString.split(',').map(email => email.trim());  
    }
  }
  