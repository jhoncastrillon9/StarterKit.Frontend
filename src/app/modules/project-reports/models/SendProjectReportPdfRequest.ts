import { ProjectReportModel } from "./projectReport.Model";

export class SendProjectReportPdfRequest {
  projectReportId: number;
    emails: string[];    

    constructor(report: ProjectReportModel, selectedEmails?: string[]) {
      this.projectReportId = report.projectReportId;  
      // Si se proporcionan emails seleccionados, usarlos; sino, extraer del cliente
      if (selectedEmails && selectedEmails.length > 0) {
        this.emails = selectedEmails;
      } else {
        this.emails = this.extractEmails(report.customerDto.email); 
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
  