/**
 * Defines a function type for intercepting and modifying WHERE clauses.
 */
type WhereInterceptorFunc = (where: string) => string;

import { ColumnOrderBy } from '../utils/row';
import { GOOGLE_SHEET_SELECT_STMT_STRING_KEYWORD } from './models';

/**
 * QueryBuilder is responsible for building SQL-like queries for Google Sheets.
 */
export class QueryBuilder {
    private _replacer: Map<string, string>;
    private _columns: string[];
    private _where: string = '';
    private _whereArgs: any[] = [];
    private _whereInterceptor: WhereInterceptorFunc | null = null;
    private _orderBy: string[] = [];
    private _limit: number = 0;
    private _offset: number = 0;

    /**
     * Creates a new QueryBuilder instance.
     * 
     * @param colReplacements Map of column name replacements
     * @param whereInterceptor Optional function to intercept and modify WHERE clauses
     * @param colSelected Columns to select
     */
    constructor(
        colReplacements: Map<string, string>,
        whereInterceptor: WhereInterceptorFunc | null,
        colSelected: string[]
    ) {
        this._replacer = colReplacements;
        this._columns = colSelected;
        this._whereInterceptor = whereInterceptor;
    }

    /**
     * Sets the WHERE condition for the query.
     * 
     * @param condition The WHERE condition with ? placeholders
     * @param args Arguments to replace the ? placeholders
     * @returns This QueryBuilder instance for chaining
     */
    where(condition: string, ...args: any[]): QueryBuilder {
        this._where = condition;
        this._whereArgs = args;
        return this;
    }

    /**
     * Sets the ORDER BY clause for the query.
     * 
     * @param ordering Array of column ordering specifications
     * @returns This QueryBuilder instance for chaining
     */
    orderBy(ordering: ColumnOrderBy[]): QueryBuilder {
        const orderByStrings: string[] = [];
        for (const o of ordering) {
            orderByStrings.push(`${o.column} ${o.orderBy}`);
        }

        this._orderBy = orderByStrings;
        return this;
    }

    /**
     * Sets the LIMIT clause for the query.
     * 
     * @param limit Maximum number of rows to return
     * @returns This QueryBuilder instance for chaining
     */
    limit(limit: number): QueryBuilder {
        this._limit = limit;
        return this;
    }

    /**
     * Sets the OFFSET clause for the query.
     * 
     * @param offset Number of rows to skip
     * @returns This QueryBuilder instance for chaining
     */
    offset(offset: number): QueryBuilder {
        this._offset = offset;
        return this;
    }

    /**
     * Generates the SQL query string.
     * 
     * @returns The generated SQL query string or an error
     */
    generate(): string {
        const stmt: string[] = ['select'];

        this.writeCols(stmt);
        this.writeWhere(stmt);
        this.writeOrderBy(stmt);
        this.writeOffset(stmt);
        this.writeLimit(stmt);

        return stmt.join(' ');
    }

    /**
     * Writes the column selection part of the query.
     * 
     * @param stmt The statement builder array
     */
    private writeCols(stmt: string[]): void {
        const translated: string[] = [];
        for (const col of this._columns) {
            translated.push(this.replaceColumn(col));
        }

        stmt.push(translated.join(', '));
    }

    /**
     * Writes the WHERE clause of the query.
     * 
     * @param stmt The statement builder array
     */
    private writeWhere(stmt: string[]): void {
        let whereClause = this._where;
        if (this._whereInterceptor) {
            whereClause = this._whereInterceptor(this._where);
        }

        const nArgs = (whereClause.match(/\?/g) || []).length;
        if (nArgs !== this._whereArgs.length) {
            throw new Error(`Number of arguments required in the 'where' clause (${nArgs}) is not the same as the number of provided arguments (${this._whereArgs.length})`);
        }

        whereClause = this.replaceColumn(whereClause);
        const tokens = whereClause.split('?');

        const result: string[] = [];
        result.push(tokens[0]?.trim() ?? '');

        for (let i = 0; i < this._whereArgs.length; i++) {
            const arg = this.convertArg(this._whereArgs[i]);
            result.push(arg, tokens[i + 1]?.trim() ?? '');
        }

        stmt.push('where', result.join(' '));
    }

    /**
     * Converts an argument to its string representation for the query.
     * 
     * @param arg The argument to convert
     * @returns String representation of the argument
     */
    private convertArg(arg: any): string {
        if (typeof arg === 'number') {
            return String(arg);
        } else if (typeof arg === 'string' || arg instanceof Uint8Array) {
            return this.convertString(arg);
        } else if (typeof arg === 'boolean') {
            return String(arg);
        } else {
            throw new Error('Unsupported argument type');
        }
    }

    /**
     * Converts a string or byte array to its string representation.
     * 
     * @param arg The string or byte array to convert
     * @returns String representation of the string or byte array
     */
    private convertString(arg: string | Uint8Array): string {
        if (arg instanceof Uint8Array) {
            return JSON.stringify(new TextDecoder().decode(arg));
        }

        const cleaned = arg.toLowerCase().trim();
        // Check if the string is a Google Sheets keyword
        if (GOOGLE_SHEET_SELECT_STMT_STRING_KEYWORD.test(cleaned)) {
            return arg;
        }

        return JSON.stringify(arg);
    }

    /**
     * Writes the ORDER BY clause of the query.
     * 
     * @param stmt The statement builder array
     */
    private writeOrderBy(stmt: string[]): void {
        if (this._orderBy.length === 0) {
            return;
        }

        const result: string[] = [];
        for (const o of this._orderBy) {
            result.push(this.replaceColumn(o));
        }

        stmt.push('order by', result.join(', '));
    }

    /**
     * Writes the OFFSET clause of the query.
     * 
     * @param stmt The statement builder array
     */
    private writeOffset(stmt: string[]): void {
        if (this._offset === 0) {
            return;
        }

        stmt.push('offset', String(this._offset));
    }

    /**
     * Writes the LIMIT clause of the query.
     * 
     * @param stmt The statement builder array
     */
    private writeLimit(stmt: string[]): void {
        if (this._limit === 0) {
            return;
        }

        stmt.push('limit', String(this._limit));
    }

    /**
     * Replaces column names in a string according to the replacer map.
     * 
     * @param str The string containing column names to replace
     * @returns The string with column names replaced
     */
    private replaceColumn(str: string): string {
        let result = str;
        for (const [col, repl] of this._replacer.entries()) {
            result = result.replace(new RegExp(col, 'g'), repl);
        }
        return result;
    }
}
