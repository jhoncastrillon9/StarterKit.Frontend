export class BudgetHistoryModel {
    budgetHistoryId: number = 0;
    fecha: Date = new Date();
    budgetId: number = 0;
    budgetName: string = "";
    internalCode: number = 0;
    companyId: number = 0;
    estado: string = "";
    logCambio: string = "";
    userId: number | null = null;
}

export class BudgetHistoryFilterRequest {
    budgetHistoryId: number = 0;
    budgetId: number = 0;
    page: number = 1;
    pageSize: number = 10;
    userId: number = 0;
    fromDate: Date | null = null;
    toDate: Date | null = null;
    logCambio: string = "";
}

export class BudgetHistoryResponse {
    total: number = 0;
    items: BudgetHistoryModel[] = [];
}
