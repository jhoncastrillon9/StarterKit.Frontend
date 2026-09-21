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
    pageSize: number = 25;
    userId: number = 0;
    fromDate: Date | null = null;
    toDate: Date | null = null;
    logCambio: string = "";
    /** Numero de cotizacion (exacto). */
    internalCode: number | null = null;
    /** Nombre de la obra (parcial). */
    budgetName: string = "";
    /** Estados seleccionados en el filtro de columna. */
    estados: string[] = [];
    /** Busqueda global de la cabecera de la tabla. */
    search: string = "";
    sortField: string = "fecha";
    sortOrder: number = -1;
}

export class BudgetHistoryResponse {
    total: number = 0;
    items: BudgetHistoryModel[] = [];
}
