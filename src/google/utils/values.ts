/**
 * Escapes a value to ensure proper string representation in Google Sheets.
 * Prefixes strings with a single quote to prevent automatic type conversion.
 * 
 * @param value - The value to escape
 * @returns The escaped value
 */
export function escapeValue(value: any): any {
    if (typeof value === 'string') {
        return `'${value}`;
    }
    return value;
}

/**
 * Error class for IEEE 754 safe integer boundary violations
 */
export class IEEE754SafeIntegerError extends Error {
    constructor() {
        super('Integer provided is not within the IEEE 754 safe integer boundary of [-(2^53), 2^53], the integer may have a precision loss');
        this.name = 'IEEE754SafeIntegerError';
    }
}

/**
 * Checks if a numeric value is within IEEE 754 safe integer boundaries.
 * 
 * @param value - The value to check
 * @throws {IEEE754SafeIntegerError} If the value is outside safe integer boundaries
 */
export function checkIEEE754SafeInteger(value: any): void {
    if (typeof value !== 'number') {
        return;
    }

    if (!Number.isSafeInteger(value)) {
        throw new IEEE754SafeIntegerError();
    }
}
