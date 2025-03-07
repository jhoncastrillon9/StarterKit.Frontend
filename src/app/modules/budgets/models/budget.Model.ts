import {CustomerModel} from '../../customers/models/customer.Model';
export class BudgetModel {
    budgetId: number =0;
    customerId: number=0;
    internalCode: number=0;
    userId: number=0;
    budgetName: string ="";
    wayToPay: string ="";
    validityOffer: string ="";
    deliveryTime: string ="";
    isInvoice: boolean = false;
    note: string ="";
    amount: number =0;
    total: number =0;
    date: Date = new Date;
    budgetDetailsDto: BudgetDetailModel[] = [];
    customerDto: CustomerModel = new CustomerModel;
}


export class BudgetDetailModel {
    budgetDetailId: number=0;
    budgetId: number=0;
    description: string ="";
    unitMeasurement: string ="";
    quantity: number=0;
    price: number=0;
}
