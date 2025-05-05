import {
    DEFAULT_ROW_FULL_TABLE_RANGE,
    ROW_WHERE_NON_EMPTY_CONDITION_TEMPLATE_FUNC,
    ROW_DELETE_RANGE_TEMPLATE_FUNC,
    ROW_WHERE_EMPTY_CONDITION_TEMPLATE,
    ROW_IDX_COL,
    ROW_IDX_FORMULA,
} from './models';

import { QueryBuilder } from './query';
import { QueryRowsResult } from '../sheets/models';
import { ColumnOrderBy } from '../utils/row';
import { ColsMapping } from '../utils/range';
import { Wrapper } from '../sheets/wrapper';
import { escapeValue as commonEscapeValue, checkIEEE754SafeInteger } from '../utils/values';
import { getA1Range } from '../utils/range';
import {
    BatchUpdateRowsRequest,
} from '../sheets/models';

interface RowStore {
    getColsMapping(): ColsMapping
    getColsWithFormula(): Set<string>
    getWrapper(): Wrapper
    getSpreadsheetId(): string
    getSheetName(): string
    getConfig(): {
        columns: string[],
        columnsWithFormula: string[],
    }
}

export function ridWhereClauseInterceptor(where: string) {
    if (where && where.length > 0) {
        return ROW_WHERE_NON_EMPTY_CONDITION_TEMPLATE_FUNC(where);
    }
    return ROW_WHERE_EMPTY_CONDITION_TEMPLATE;
}

export class GoogleSheetSelectStmt {
    private store: RowStore;
    private columns: string[];
    private queryBuilder: QueryBuilder;

    constructor(store: RowStore, columns: string[]) {
        if (columns.length === 0) {
            columns = store.getConfig().columns
        }
        this.store = store;
        this.columns = columns;
        this.queryBuilder = new QueryBuilder(
            this.store.getColsMapping().getNameMap(),
            ridWhereClauseInterceptor,
            columns,
        );
    }

    /**
     * Specifies the WHERE clause condition with placeholders (`?`) and args
     */
    where(condition: string, ...args: any[]): this {
        this.queryBuilder.where(condition, ...args);
        return this;
    }

    /**
     * Specifies the ORDER BY clause
     */
    orderBy(ordering: ColumnOrderBy[]): this {
        this.queryBuilder.orderBy(ordering);
        return this;
    }

    /**
     * Limits the number of rows to retrieve
     */
    limit(limit: number): this {
        this.queryBuilder.limit(limit)
        return this
    }

    /**
     * Skips the first `offset` rows
     */
    offset(offset: number): this {
        this.queryBuilder.offset(offset)
        return this
    }

    /**
     * Executes the query and returns an array of row objects
     */
    async exec(): Promise<Array<Record<string, any>>> {
        const stmt = this.queryBuilder.generate();
        const result: QueryRowsResult = await this.store.getWrapper().queryRows(
            this.store.getSpreadsheetId(),
            this.store.getSheetName(),
            stmt,
            true,
        );
        return this.buildQueryResultMap(result);
    }

    /**
     * Maps raw row data into an array of objects keyed by column name
     */
    private buildQueryResultMap(
        original: QueryRowsResult
    ): Array<Record<string, any>> {
        return original.rows.map(row => {
            const obj: Record<string, any> = {};
            this.columns.forEach((col, idx) => {
                if (col === '_rid') {
                    return
                }
                obj[col] = row[idx]
            });
            return obj;
        });
    }
}

export class GoogleSheetInsertStmt {
    constructor(
        private store: RowStore,
        private rows: object[],
    ) {
        this.store = store;
        this.rows = rows;
    }

    private convertObjectToFieldMap(row: any): Map<string, any> {
        const fieldMap = new Map<string, any>();

        while (row && row !== Object.prototype) {
            Object.getOwnPropertyNames(row)
                .filter(key => typeof row[key] !== "function" && !(key in fieldMap))
                .forEach(key => {
                    fieldMap.set(key, row[key]);
                });

            row = Object.getPrototypeOf(row);
        }

        return fieldMap;
    }

    private convertRowToArray(row: object): any[] {
        if (row === null) {
            throw new Error('row type must not be null')
        }
        if (typeof row !== 'object' || Array.isArray(row)) {
            throw new Error('row type must be an object')
        }

        const output: Map<string, any> = this.convertObjectToFieldMap(row)
        const result: any[] = new Array(this.store.getColsMapping().getNameMap().size).fill(undefined)
        result[0] = ROW_IDX_FORMULA

        output.forEach((val, col) => {
            if (!this.store.getColsMapping().hasCol(col)) {
                return
            }

            const colIdx = this.store.getColsMapping().getColIdx(col)
            const escapedValue = escapeValue(col, val, this.store.getColsWithFormula())
            checkIEEE754SafeInteger(escapedValue)
            result[colIdx.idx] = escapedValue
        })

        return result
    }

    async exec(): Promise<void> {
        if (this.rows.length === 0) {
            return
        }

        const convertedRows: any[][] = this.rows.map(row => this.convertRowToArray(row))
        await this.store.getWrapper().overwriteRows(
            this.store.getSpreadsheetId(),
            getA1Range(this.store.getSheetName(), DEFAULT_ROW_FULL_TABLE_RANGE),
            convertedRows,
        )
    }
}

export class GoogleSheetUpdateStmt {
    private queryBuilder: QueryBuilder

    constructor(
        private store: RowStore,
        private colToValue: Record<string, any>
    ) {
        this.queryBuilder = new QueryBuilder(
            this.store.getColsMapping().getNameMap(),
            ridWhereClauseInterceptor,
            [ROW_IDX_COL],
        )
        this.colToValue = colToValue
    }

    where(condition: string, ...args: any[]): this {
        this.queryBuilder.where(condition, ...args)
        return this
    }

    async exec(): Promise<void> {
        if (Object.keys(this.colToValue).length === 0) {
            throw new Error('empty colToValue, at least one column must be updated')
        }

        const indices = await getRowIndices(this.store, this.queryBuilder.generate())
        if (indices.length === 0) {
            return
        }

        const requests = this.generateBatchUpdateRequests(indices)
        await this.store.getWrapper().batchUpdateRows(this.store.getSpreadsheetId(), requests)
    }

    private generateBatchUpdateRequests(rowIndices: number[]): BatchUpdateRowsRequest[] {
        const reqs: BatchUpdateRowsRequest[] = []

        Object.entries(this.colToValue).forEach(([col, val]) => {
            if (!this.store.getColsMapping().hasCol(col)) {
                throw new Error(`failed to update, unknown column name provided: ${col}`)
            }

            const colIdx = this.store.getColsMapping().getColIdx(col)
            const escaped = escapeValue(col, val, this.store.getColsWithFormula())
            checkIEEE754SafeInteger(escaped)

            for (const rowIdx of rowIndices) {
                const a1Range = colIdx.name + rowIdx
                reqs.push({
                    a1Range: getA1Range(this.store.getSheetName(), a1Range),
                    values: [[escaped]],
                })
            }
        })

        return reqs
    }
}

export class GoogleSheetDeleteStmt {
    private queryBuilder: QueryBuilder

    constructor(private store: RowStore) {
        this.queryBuilder = new QueryBuilder(
            this.store.getColsMapping().getNameMap(),
            ridWhereClauseInterceptor,
            [ROW_IDX_COL],
        )
    }

    where(condition: string, ...args: any[]): this {
        this.queryBuilder.where(condition, ...args)
        return this
    }

    async exec(): Promise<void> {
        const selectSql = this.queryBuilder.generate()
        const indices = await getRowIndices(this.store, selectSql)

        if (indices.length === 0) {
            return
        }

        const ranges = generateRowA1Ranges(this.store.getSheetName(), indices)
        await this.store.getWrapper().clear(
            this.store.getSpreadsheetId(),
            ranges,
        )
    }
}

export class GoogleSheetCountStmt {
    private queryBuilder: QueryBuilder

    constructor(private store: RowStore) {
        const countExpr = `COUNT(${ROW_IDX_COL})`
        this.queryBuilder = new QueryBuilder(
            this.store.getColsMapping().getNameMap(),
            ridWhereClauseInterceptor,
            [countExpr],
        )
    }

    where(condition: string, ...args: any[]): this {
        this.queryBuilder.where(condition, ...args)
        return this
    }

    async exec(): Promise<number> {
        const selectSql = this.queryBuilder.generate()
        const result: QueryRowsResult = await this.store.getWrapper().queryRows(
            this.store.getSpreadsheetId(),
            this.store.getSheetName(),
            selectSql,
            true,
        )

        if (result.rows.length < 1 || result.rows[0]!.length < 1) {
            return 0
        }
        if (result.rows.length !== 1 || result.rows[0]!.length !== 1) {
            throw new Error(`unexpected result for count: ${JSON.stringify(result)}`)
        }

        const raw = result.rows[0]![0]
        if (typeof raw !== 'number') {
            throw new Error(`invalid count type: ${typeof raw}`)
        }
        return Math.trunc(raw)
    }
}

async function getRowIndices(store: RowStore, selectSql: string): Promise<number[]> {
    const res: QueryRowsResult = await store.getWrapper().queryRows(
        store.getSpreadsheetId(),
        store.getSheetName(),
        selectSql,
        true,
    )
    if (res.rows.length === 0) {
        return []
    }

    const indices: number[] = []
    for (const row of res.rows) {
        if (row.length !== 1) {
            throw new Error(`error retrieving row indices: ${JSON.stringify(res)}`)
        }

        const v = row[0]
        if (typeof v !== 'number') {
            throw new Error(`error converting row index, value: ${JSON.stringify(v)}`)
        }
        indices.push(Math.trunc(v))
    }
    return indices
}

function generateRowA1Ranges(
    sheetName: string,
    indices: number[]
): string[] {
    return indices.map(idx => {
        const rawRange = ROW_DELETE_RANGE_TEMPLATE_FUNC(idx, idx)
        return getA1Range(sheetName, rawRange)
    })
}

export function escapeValue(col: string, value: any, colsWithFormula: Set<string>): any {
    if (!colsWithFormula.has(col)) {
        return commonEscapeValue(value)
    }
    if (typeof value !== 'string') {
        throw new Error(`value of column ${col} is not a string, but expected to contain formula`)
    }
    return value
}