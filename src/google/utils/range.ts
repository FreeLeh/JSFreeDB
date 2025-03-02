/**
 * Combines sheet name and range into A1 notation
 * 
 * @param sheetName - Name of the sheet
 * @param range - Range in A1 notation without sheet name
 * @returns Complete A1 notation with sheet name
 */
export function getA1Range(sheetName: string, range: string): string {
    return `${sheetName}!${range}`;
}

/**
 * Represents a column index with its A1 notation name and numeric index
 */
export interface ColIdx {
    name: string;
    idx: number;
}

/**
 * Maps column identifiers to their A1 notation and index information
 */
export class ColsMapping {
    private mapping: Map<string, ColIdx>;

    constructor(mapping: Map<string, ColIdx>) {
        this.mapping = mapping;
    }

    public getNameMap(): Map<string, string> {
        const entries = this.mapping.entries();
        return new Map<string, string>(
            Array.from(entries).map(([key, value]) => [key, value.name])
        );
    }
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Generates A1 notation column mapping for given column identifiers
 * 
 * @param columns - Array of column identifiers
 * @returns Mapping of column identifiers to their A1 notation and index
 */
export function generateColumnMapping(columns: string[]): Map<string, ColIdx> {
    return new Map(
        columns.map((col, idx) => [
            col,
            {
                name: generateColumnName(idx),
                idx,
            },
        ])
    );
}

/**
 * Converts a zero-based index to A1 notation column name
 * 
 * @param n - Zero-based column index
 * @returns Column name in A1 notation (e.g., A, B, ..., Z, AA, AB, etc.)
 * 
 * @example
 * ```typescript
 * generateColumnName(0)  // returns "A"
 * generateColumnName(25) // returns "Z"
 * generateColumnName(26) // returns "AA"
 * generateColumnName(27) // returns "AB"
 * ```
 */
export function generateColumnName(n: number): string {
    // This is not a pure Base26 conversion since the second char can start from "A" (or 0) again.
    // In a normal Base26 int to string conversion, the second char can only start from "B" (or 1).
    // Hence, we need to handle the first digit separately from subsequent digits.
    // For subsequent digits, we subtract 1 first to ensure they start from 0, not 1.
    let col = ALPHABET[n % 26]!;
    n = Math.floor(n / 26);

    while (n > 0) {
        n -= 1;
        col = ALPHABET[n % 26]! + col;
        n = Math.floor(n / 26);
    }

    return col;
}
