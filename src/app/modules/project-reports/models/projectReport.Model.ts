  import { ProjectReportDetailModel } from "./projectReportDetail.Model";
  import { CustomerModel } from "../../customers/models/customer.Model";
import { BudgetModel } from "../../budgets/models/budget.Model";
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
    projectReportDetailsDto: ProjectReportDetailModel[] = [];
    customerDto: CustomerModel = new CustomerModel;
    budgetDTO: BudgetModel = new BudgetModel; 
    customerName: string = this.customerDto.customerName;
  }