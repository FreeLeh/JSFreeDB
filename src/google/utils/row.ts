/**
 * OrderBy defines the type of column ordering used for selecting rows.
 */
export enum OrderBy {
    ASC = 'ASC',
    DESC = 'DESC',
}

/**
 * ColumnOrderBy defines what ordering is required for a particular column
 * when selecting rows.
 */
export interface ColumnOrderBy {
    column: string;
    orderBy: OrderBy;
}