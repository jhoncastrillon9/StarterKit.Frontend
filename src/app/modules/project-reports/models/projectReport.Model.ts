  import { ProjectReportDetailModel } from "./projectReportDetail.Model";
  import { CustomerModel } from "../../customers/models/customer.Model";
  export class ProjectReportModel {
    projectReportId: number = 0;
    budgetId: number =0;
    customerId: number=0;
    internalCode: number=0;    
    budgetInternalCode: number=0;     
    projectReportName: string ="";    
    budgetName: string ="";   
    note: string ="";    
    date: Date = new Date;
    budgetDetailsDto: ProjectReportDetailModel[] = [];
    curtomerName: string ="";  
 
  }