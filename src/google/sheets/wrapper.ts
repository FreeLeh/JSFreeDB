import * as google from 'googleapis';
import axios, { AxiosInstance } from 'axios';

import { AuthClient } from '../auth/base';
import {
    AppendMode,
    A1Range,
    BatchUpdateRowsRequest,
    BatchUpdateRowsResult,
    InsertRowsResult,
    QueryRowsResult,
    RawQueryRowsResult,
    RawQueryRowsResultCell,
    UpdateRowsResult,
    QUERY_ROWS_URL_TEMPLATE,
    RESPONSE_VALUE_RENDER_FORMATTED,
    VALUE_INPUT_USER_ENTERED,
    MAJOR_DIMENSION_ROWS,
} from './models';

export class Wrapper {
    private authClient: google.Auth.GoogleAuth | google.Auth.OAuth2Client;
    private service: google.sheets_v4.Sheets;
    private rawClient: AxiosInstance;

    constructor(auth: AuthClient) {
        this.authClient = auth.getAuthHeadersClient();
        this.service = google.google.sheets({ version: 'v4', auth: this.authClient });
        this.rawClient = axios.create({ validateStatus: () => true });
    }

    /**
     * Creates a new Google Spreadsheet with the specified title
     */
    async createSpreadsheet(title: string): Promise<string> {
        const response = await this.service.spreadsheets.create({
            requestBody: {
                properties: { title },
            },
        });

        if (!response.data.spreadsheetId) {
            throw new Error('Failed to create spreadsheet, no ID returned');
        }

        return response.data.spreadsheetId;
    }

    /**
     * Creates a new sheet within an existing spreadsheet
     */
    async createSheet(spreadsheetId: string, sheetName: string): Promise<void> {
        await this.service.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: [
                    {
                        addSheet: {
                            properties: { title: sheetName },
                        },
                    },
                ],
            },
        });
    }

    /**
     * Gets a mapping of sheet names to sheet IDs
     */
    async getSheetNameToID(spreadsheetId: string): Promise<Record<string, number>> {
        const response = await this.service.spreadsheets.get({
            spreadsheetId,
        });

        if (!response.data.sheets) {
            throw new Error('Failed to get sheet information');
        }

        const result: Record<string, number> = {};
        for (const sheet of response.data.sheets) {
            if (!sheet.properties) {
                throw new Error('Failed getSheetIDByName due to empty sheet properties');
            }

            const title = sheet.properties.title;
            const id = sheet.properties.sheetId;

            if (title && id) {
                result[title] = id
            }
        }

        return result;
    }

    /**
     * Deletes specified sheets by their IDs
     */
    async deleteSheets(spreadsheetId: string, sheetIDs: number[]): Promise<void> {
        const requests = sheetIDs.map(sheetId => ({
            deleteSheet: {
                sheetId,
            },
        }));

        await this.service.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests,
            },
        });
    }

    /**
     * Inserts rows at the specified range
     */
    async insertRows(
        spreadsheetId: string,
        a1Range: string,
        values: any[][],
    ): Promise<InsertRowsResult> {
        return this.internalInsertRows(
            spreadsheetId,
            a1Range,
            values,
            AppendMode.INSERT,
        );
    }

    /**
     * Overwrites rows at the specified range
     */
    async overwriteRows(
        spreadsheetId: string,
        a1Range: string,
        values: any[][],
    ): Promise<InsertRowsResult> {
        return this.internalInsertRows(
            spreadsheetId,
            a1Range,
            values,
            AppendMode.OVERWRITE,
        );
    }

    /**
     * Internal method for inserting or overwriting rows
     */
    private async internalInsertRows(
        spreadsheetId: string,
        a1Range: string,
        values: any[][],
        mode: AppendMode,
    ): Promise<InsertRowsResult> {
        const response = await this.service.spreadsheets.values.append({
            spreadsheetId,
            range: a1Range,
            insertDataOption: mode,
            includeValuesInResponse: true,
            responseValueRenderOption: RESPONSE_VALUE_RENDER_FORMATTED,
            valueInputOption: VALUE_INPUT_USER_ENTERED,
            requestBody: {
                majorDimension: MAJOR_DIMENSION_ROWS,
                range: a1Range,
                values,
            },
        });

        if (!response.data.updates) {
            throw new Error('Failed to update spreadsheet, no updates returned');
        }

        return {
            updatedRange: new A1Range(response.data.updates.updatedRange || ''),
            updatedRows: response.data.updates.updatedRows || 0,
            updatedColumns: response.data.updates.updatedColumns || 0,
            updatedCells: response.data.updates.updatedCells || 0,
            insertedValues: response.data.updates.updatedData?.values || [],
        };
    }

    /**
     * Updates rows at the specified range
     */
    async updateRows(
        spreadsheetId: string,
        a1Range: string,
        values: any[][],
    ): Promise<UpdateRowsResult> {
        const response = await this.service.spreadsheets.values.update({
            spreadsheetId,
            range: a1Range,
            includeValuesInResponse: true,
            responseValueRenderOption: RESPONSE_VALUE_RENDER_FORMATTED,
            valueInputOption: VALUE_INPUT_USER_ENTERED,
            requestBody: {
                majorDimension: MAJOR_DIMENSION_ROWS,
                range: a1Range,
                values,
            },
        });

        if (!response.data) {
            throw new Error('Failed to update spreadsheet, no data returned');
        }

        return {
            updatedRange: new A1Range(response.data.updatedRange || ''),
            updatedRows: response.data.updatedRows || 0,
            updatedColumns: response.data.updatedColumns || 0,
            updatedCells: response.data.updatedCells || 0,
            updatedValues: response.data.updatedData?.values || [],
        };
    }

    /**
     * Batch update multiple ranges of rows
     */
    async batchUpdateRows(
        spreadsheetId: string,
        requests: BatchUpdateRowsRequest[],
    ): Promise<BatchUpdateRowsResult> {
        const data = requests.map(req => ({
            majorDimension: MAJOR_DIMENSION_ROWS,
            range: req.a1Range,
            values: req.values,
        }));

        const response = await this.service.spreadsheets.values.batchUpdate({
            spreadsheetId,
            requestBody: {
                data,
                includeValuesInResponse: true,
                responseValueRenderOption: RESPONSE_VALUE_RENDER_FORMATTED,
                valueInputOption: VALUE_INPUT_USER_ENTERED,
            },
        });

        if (!response.data.responses) {
            throw new Error('Failed to batch update spreadsheet, no responses returned');
        }

        return response.data.responses.map(resp => ({
            updatedRange: new A1Range(resp.updatedRange || ''),
            updatedRows: resp.updatedRows || 0,
            updatedColumns: resp.updatedColumns || 0,
            updatedCells: resp.updatedCells || 0,
            updatedValues: resp.updatedData?.values || [],
        }));
    }

    /**
     * Query rows with Google Visualization API Query Language
     */
    async queryRows(
        spreadsheetId: string,
        sheetName: string,
        query: string,
        skipHeader: boolean,
    ): Promise<QueryRowsResult> {
        const rawResult = await this.execQueryRows(spreadsheetId, sheetName, query, skipHeader);
        return this.toQueryRowsResult(rawResult);
    }

    /**
     * Execute the raw query against Google Sheets
     */
    private async execQueryRows(
        spreadsheetId: string,
        sheetName: string,
        query: string,
        skipHeader: boolean,
    ): Promise<RawQueryRowsResult> {
        const params = new URLSearchParams();
        params.append('sheet', sheetName);
        params.append('tqx', 'responseHandler:freedb');
        params.append('tq', query);
        params.append('headers', skipHeader ? '1' : '0');

        const url = QUERY_ROWS_URL_TEMPLATE.replace('%s', spreadsheetId) + '?' + params.toString();

        // Note that the request headers from the Google Auth object must be used at the time of request.
        // This ensures the latest access token is used (and refreshed if needed).
        const response = await this.rawClient.get(
            url,
            { headers: await this.authClient.getRequestHeaders() },
        );
        if (response.status !== 200) {
            throw new Error(`Failed to query rows, status: ${response.status}`);
        }

        const respString = response.data;

        // The response is not pure JSON, it's wrapped in a function call
        // Need to extract the JSON part
        const firstCurly = respString.indexOf('{');
        if (firstCurly === -1) {
            throw new Error(`Opening curly bracket not found: ${respString}`);
        }

        const lastCurly = respString.lastIndexOf('}');
        if (lastCurly === -1) {
            throw new Error(`Closing curly bracket not found: ${respString}`);
        }

        const jsonPart = respString.substring(firstCurly, lastCurly + 1);
        try {
            return JSON.parse(jsonPart);
        } catch (err) {
            throw new Error(`Failed to parse query response: ${err}`);
        }
    }

    /**
     * Convert raw query result to QueryRowsResult
     */
    private toQueryRowsResult(rawResult: RawQueryRowsResult): QueryRowsResult {
        const result: QueryRowsResult = {
            rows: [],
        };

        if (!rawResult.table || !rawResult.table.rows) {
            return result;
        }

        result.rows = rawResult.table.rows.map(row => {
            return row.c.map((cell, cellIdx) => {
                return this.convertRawValue(rawResult.table.cols[cellIdx]!.type, cell);
            });
        });

        return result;
    }

    /**
     * Convert raw cell value based on column type
     */
    private convertRawValue(colType: string, cell: RawQueryRowsResultCell): any {
        if (!cell) {
            return null;
        }

        switch (colType) {
            case 'boolean':
            case 'number':
            case 'string':
                return cell.v;
            case 'date':
            case 'datetime':
            case 'timeofday':
                return cell.f;
            default:
                throw new Error(`Unsupported cell value type: ${colType}`);
        }
    }

    /**
     * Clear ranges in the spreadsheet
     */
    async clear(spreadsheetId: string, ranges: string[]): Promise<string[]> {
        const response = await this.service.spreadsheets.values.batchClear({
            spreadsheetId,
            requestBody: {
                ranges,
            },
        });

        return response.data.clearedRanges || [];
    }
}
