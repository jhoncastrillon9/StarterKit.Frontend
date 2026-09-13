import {BudgetModel} from '../../budgets/models/budget.Model';

export class PaymentGroupModel {
    budgetId: number =0;
    payments: PaymentModel[] = [];
    budget: BudgetModel = new BudgetModel;    
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
    transferId: number | null = null;
    /**
     * Datos de la transferencia a la que pertenece el pago, denormalizados por
     * el backend en el propio `PaymentDTO`. Los tres son nulos cuando el pago no
     * pertenece a ninguna transferencia (`transferId` nulo), así que no hace
     * falta pedir la transferencia por separado solo para etiquetar un abono.
     */
    transferAmount: number | null = null;
    transferDate: Date | null = null;
    transferNote: string | null = null;
    /** Solo viene poblado cuando el Payment se devuelve dentro de un PaymentTransferModel.payments. */
    budget?: { internalCode: number; budgetName: string } | null;
}

export class PaymentTransferAllocation {
    budgetId: number = 0;
    amount: number = 0;
    paymentType: string = 'Abono';
    note: string = '';
}

export class CreatePaymentTransferRequest {
    customerId: number = 0;
    totalAmount: number = 0;
    transferDate: Date = new Date();
    note: string = '';
    allocations: PaymentTransferAllocation[] = [];
}

export class PaymentTransferModel {
    paymentTransferId: number = 0;
    companyId: number = 0;
    customerId: number = 0;
    userId: number = 0;
    totalAmount: number = 0;
    transferDate: Date = new Date();
    note: string = '';
    payments: PaymentModel[] = [];
}
