import {BudgetModel} from '../../budgets/models/budget.Model';

export class PaymentGroupModel {
    budgetId: number =0;
    Payments: PaymentModel[] = [];
    Budget: BudgetModel = new BudgetModel;    
    totalAmount: number=0;
    differenceAmount: number=0;
}

export class PaymentModel {
    paymentId: number =0;
    budgetId: number=0;
    companyId: number=0;
    userId: number=0;
    paymentType: string ="";
    amountPaid: number =0;
    note: string ="";
    paymentDate: Date = new Date;    
}
