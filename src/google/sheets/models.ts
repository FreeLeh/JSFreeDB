export const MAJOR_DIMENSION_ROWS = "ROWS";
export const VALUE_INPUT_USER_ENTERED = "USER_ENTERED";
export const RESPONSE_VALUE_RENDER_FORMATTED = "FORMATTED_VALUE";
export const QUERY_ROWS_URL_TEMPLATE = "https://docs.google.com/spreadsheets/d/%s/gviz/tq";

export enum AppendMode {
    INSERT = "INSERT_ROWS",
    OVERWRITE = "OVERWRITE"
}

export class A1Range {
    original: string;
    sheetName: string;
    fromCell: string;
    toCell: string;

    constructor(s: string) {
        this.original = s;

        const exclamationIdx = s.indexOf('!');
        const colonIdx = s.indexOf(':');

        if (exclamationIdx === -1) {
            if (colonIdx === -1) {
                this.sheetName = "";
                this.fromCell = s;
                this.toCell = s;
            } else {
                this.sheetName = "";
                this.fromCell = s.substring(0, colonIdx);
                this.toCell = s.substring(colonIdx + 1);
            }
        } else {
            if (colonIdx === -1) {
                this.sheetName = s.substring(0, exclamationIdx);
                this.fromCell = s.substring(exclamationIdx + 1);
                this.toCell = s.substring(exclamationIdx + 1);
            } else {
                this.sheetName = s.substring(0, exclamationIdx);
                this.fromCell = s.substring(exclamationIdx + 1, colonIdx);
                this.toCell = s.substring(colonIdx + 1);
            }
        }
    }

    toString(): string {
        return this.original;
    }
}

export interface InsertRowsResult {
    updatedRange: A1Range;
    updatedRows: number;
    updatedColumns: number;
    updatedCells: number;
    insertedValues: any[][];
}

export interface UpdateRowsResult {
    updatedRange: A1Range;
    updatedRows: number;
    updatedColumns: number;
    updatedCells: number;
    updatedValues: any[][];
}

export interface BatchUpdateRowsRequest {
    a1Range: string;
    values: any[][];
}

export type BatchUpdateRowsResult = UpdateRowsResult[];

export interface QueryRowsResult {
    rows: any[][];
}

export interface RawQueryRowsResult {
    table: RawQueryRowsResultTable;
}

interface RawQueryRowsResultTable {
    cols: RawQueryRowsResultColumn[];
    rows: RawQueryRowsResultRow[];
}

interface RawQueryRowsResultColumn {
    id: string;
    type: string;
}

interface RawQueryRowsResultRow {
    c: RawQueryRowsResultCell[];
}

export interface RawQueryRowsResultCell {
    v: any;  // Value
    f: string; // Raw/formatted value
}