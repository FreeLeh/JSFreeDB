import { AuthClient } from '../auth/base'

import { Wrapper } from '../sheets/wrapper'
import {
    GoogleSheetSelectStmt,
    GoogleSheetInsertStmt,
    GoogleSheetUpdateStmt,
    GoogleSheetDeleteStmt,
    GoogleSheetCountStmt
} from './stmt'
import { DEFAULT_ROW_HEADER_RANGE } from './models'
import {
    ColsMapping,
    generateColumnMapping
} from '../utils/range'
import { getA1Range } from '../utils/range'
import { ROW_IDX_COL } from './models'

/**
 * GoogleSheetRowStoreConfig defines a list of configurations that can be used to customise how the GoogleSheetRowStore works.
 */
export class GoogleSheetRowStoreConfig {
    /**
     * Defines the list of column names.
     * Note that the column ordering matters and will be used for arranging the real columns in Google Sheet.
     * Changing the column ordering in this config but not in the sheet will result in unexpected behaviour.
     */
    columns: string[];
    /**
     * Defines the list of column names containing a Google Sheet formula.
     * Note that only string fields can have a formula.
     */
    columnsWithFormula: string[];

    constructor(
        columns: string[],
        columnsWithFormula: string[] = []
    ) {
        this.columns = columns;
        this.columnsWithFormula = columnsWithFormula;
    }

    /**
     * Validates the configuration.
     * Throws an error if no columns are defined or if the number of columns exceeds the maximum allowed.
     */
    validate(): void {
        if (this.columns.length === 0) {
            throw new Error('columns must have at least one column');
        }

        const maxColumn = 26; // adjust as needed
        if (this.columns.length > maxColumn) {
            throw new Error(`you can only have up to ${maxColumn} columns`);
        }
    }
}

/**
 * GoogleSheetRowStore encapsulates row store functionality on top of a Google Sheet.
 */
export class GoogleSheetRowStore {
    private wrapper: Wrapper;
    private spreadsheetId: string;
    private sheetName: string;
    private config: GoogleSheetRowStoreConfig;
    private colsMapping: ColsMapping;
    private colsWithFormula: Set<string>;

    getColsMapping: () => ColsMapping;
    getColsWithFormula: () => Set<string>;
    getWrapper: () => Wrapper;
    getSpreadsheetId: () => string;
    getSheetName: () => string;
    getConfig: () => { columns: string[]; columnsWithFormula: string[] };

    private constructor(
        wrapper: Wrapper,
        spreadsheetId: string,
        sheetName: string,
        config: GoogleSheetRowStoreConfig
    ) {
        this.wrapper = wrapper;
        this.spreadsheetId = spreadsheetId;
        this.sheetName = sheetName;
        this.config = config;
        this.colsMapping = generateColumnMapping(config.columns);
        this.colsWithFormula = new Set(config.columnsWithFormula);

        this.getColsMapping = () => this.colsMapping;
        this.getColsWithFormula = () => this.colsWithFormula;
        this.getWrapper = () => this.wrapper;
        this.getSpreadsheetId = () => this.spreadsheetId;
        this.getSheetName = () => this.sheetName;
        this.getConfig = () => this.config;
    }

    /**
     * Creates an instance of the row-based store with the given configuration.
     * It will also try to create the sheet if it does not exist yet.
     */
    public static async create(
        auth: AuthClient,
        spreadsheetId: string,
        sheetName: string,
        config: GoogleSheetRowStoreConfig
    ): Promise<GoogleSheetRowStore> {
        config.validate();
        config = injectTimestampCol(config);

        const wrapper = new Wrapper(auth);
        await wrapper.createSheet(spreadsheetId, sheetName);

        const store = new GoogleSheetRowStore(
            wrapper,
            spreadsheetId,
            sheetName,
            config
        );

        // Clears existing headers and writes configured column names to the header row
        await store.ensureHeaders();
        return store;
    }

    /**
     * Specifies which columns to return from the Google Sheet when querying.
     * You can think of this operation like a SQL SELECT statement (with limitations).
     *
     * If columns is empty, then all columns will be returned.
     * If a column is not found in config.columns, it will be ignored.
     *
     * Note: calling select() does not execute the query yet.
     * Call GoogleSheetSelectStmt.exec() to execute.
     */
    public select(
        ...columns: string[]
    ): GoogleSheetSelectStmt {
        return new GoogleSheetSelectStmt(this, columns);
    }

    /**
     * Specifies the rows to be inserted into the Google Sheet.
     *
     * The underlying data type of each row must be a plain object.
     * Providing other data types will result in an error.
     *
     * By default, the column name follows the object key name (case-sensitive).
     *
     * Note: calling insert() does not execute the insertion yet.
     * Call GoogleSheetInsertStmt.exec() to execute.
     */
    public insert(...rows: any[]): GoogleSheetInsertStmt {
        return new GoogleSheetInsertStmt(this, rows);
    }

    /**
     * Specifies the new value for each of the targeted columns.
     *
     * The colToValue parameter specifies what value should be updated for which column.
     * Each value will be JSON serialized before sending.
     * If colToValue is empty, an error will be thrown when exec() is called.
     */
    public update(colToValue: Record<string, any>): GoogleSheetUpdateStmt {
        return new GoogleSheetUpdateStmt(this, colToValue);
    }

    /**
     * Prepares a rows deletion operation.
     *
     * Note: calling delete() does not execute the deletion yet.
     * Call GoogleSheetDeleteStmt.exec() to execute.
     */
    public delete(): GoogleSheetDeleteStmt {
        return new GoogleSheetDeleteStmt(this);
    }

    /**
     * Prepares a rows counting operation.
     *
     * Note: calling count() does not execute the query yet.
     * Call GoogleSheetCountStmt.exec() to execute.
     */
    public count(): GoogleSheetCountStmt {
        return new GoogleSheetCountStmt(this);
    }

    /**
     * Ensures that the header row is set up correctly.
     * Clears existing header and writes the configured column names.
     */
    private async ensureHeaders(): Promise<void> {
        await this.wrapper.clear(
            this.spreadsheetId,
            [getA1Range(this.sheetName, DEFAULT_ROW_HEADER_RANGE)],
        );

        const headerValues = this.config.columns.map(col => col);
        await this.wrapper.updateRows(
            this.spreadsheetId,
            getA1Range(this.sheetName, DEFAULT_ROW_HEADER_RANGE),
            [headerValues],
        );
    }
}

/**
 * The additional ROW_IDX_COL column is needed to differentiate which row is truly empty and which one is not.
 * We use this for detecting empty rows for UPDATE without a WHERE clause.
 * Otherwise, updates would affect all rows instead of non-empty ones only.
 */
export function injectTimestampCol(
    config: GoogleSheetRowStoreConfig
): GoogleSheetRowStoreConfig {
    const newColumns = [ROW_IDX_COL, ...config.columns];
    return new GoogleSheetRowStoreConfig(
        newColumns,
        config.columnsWithFormula
    );
}