import {
    BatchUpdateRowsRequest,
    BatchUpdateRowsResult,
    InsertRowsResult,
    QueryRowsResult,
    UpdateRowsResult,
} from "../sheets/models";

export const MAX_COLUMN = 26;

export const SCRATCHPAD_BOOKED = "BOOKED";
export const SCRATCHPAD_SHEET_NAME_SUFFIX = "_scratch";

export const DEFAULT_KV_TABLE_RANGE = "A1:C5000000";
export const DEFAULT_KV_KEY_COL_RANGE = "A1:A5000000";
export const DEFAULT_KV_FIRST_ROW_RANGE = "A1:C1";

export const KV_GET_APPEND_QUERY_TEMPLATE = "=VLOOKUP(\"%s\", SORT(%s, 3, FALSE), 2, FALSE)";
export const KV_GET_DEFAULT_QUERY_TEMPLATE = "=VLOOKUP(\"%s\", %s, 2, FALSE)";
export const KV_FIND_KEY_A1_RANGE_QUERY_TEMPLATE = "=MATCH(\"%s\", %s, 0)";

export const ROW_IDX_COL = "_rid";
export const ROW_IDX_FORMULA = "=ROW()";

// Helper function to generate column name (similar to common.GenerateColumnName)
function generateColumnName(index: number): string {
    return String.fromCharCode(65 + index); // 'A' is 65 in ASCII
}

// Variables
export const DEFAULT_ROW_HEADER_RANGE = `A1:${generateColumnName(MAX_COLUMN - 1)}1`;
export const DEFAULT_ROW_FULL_TABLE_RANGE = `A2:${generateColumnName(MAX_COLUMN - 1)}`;
export const ROW_DELETE_RANGE_TEMPLATE_FUNC = (from: number, to: number) => `A${from}:${generateColumnName(MAX_COLUMN - 1)}${to}`;

// The first condition `_rid IS NOT NULL` is necessary to ensure we are just updating rows that are non-empty.
// This is required for UPDATE without WHERE clause (otherwise it will see every row as update target).
export const ROW_WHERE_NON_EMPTY_CONDITION_TEMPLATE_FUNC = (where: string) => `${ROW_IDX_COL} is not null AND ${where}`;
export const ROW_WHERE_EMPTY_CONDITION_TEMPLATE = `${ROW_IDX_COL} is not null`;

export const GOOGLE_SHEET_SELECT_STMT_STRING_KEYWORD = /^(date|datetime|timeofday)/;

export interface SheetsWrapper {
    createSpreadsheet(title: string): Promise<string>;
    getSheetNameToID(spreadsheetId: string): Promise<Map<string, number>>;
    createSheet(spreadsheetId: string, sheetName: string): Promise<void>;
    deleteSheets(spreadsheetId: string, sheetIDs: number[]): Promise<void>;
    insertRows(spreadsheetId: string, a1Range: string, values: any[][]): Promise<InsertRowsResult>;
    overwriteRows(spreadsheetId: string, a1Range: string, values: any[][]): Promise<InsertRowsResult>;
    updateRows(spreadsheetId: string, a1Range: string, values: any[][]): Promise<UpdateRowsResult>;
    batchUpdateRows(spreadsheetId: string, requests: BatchUpdateRowsRequest[]): Promise<BatchUpdateRowsResult>;
    queryRows(spreadsheetId: string, sheetName: string, query: string, skipHeader: boolean): Promise<QueryRowsResult>;
    clear(spreadsheetId: string, ranges: string[]): Promise<string[]>;
}
