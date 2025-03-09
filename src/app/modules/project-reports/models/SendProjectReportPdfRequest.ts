import { ProjectReportModel } from "./projectReport.Model";

export class SendProjectReportPdfRequest {
  projectReportId: number;
    emails: string[];    

    constructor(report: ProjectReportModel) {
      this.projectReportId = report.projectReportId;  
      this.emails = this.extractEmails(report.customerDto.email); 
    } 
    
    private extractEmails(emailString: string): string[] {
      if (!emailString) {
        return [];
      }
      return emailString.split(',').map(email => email.trim());  
    }
  }
  