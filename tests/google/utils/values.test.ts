import {
    escapeValue,
    checkIEEE754SafeInteger,
    IEEE754SafeIntegerError,
} from '../../../src/google/utils/values';

describe('values', () => {
    describe('escapeValue', () => {
        it('should escape string values with a leading quote', () => {
            expect(escapeValue('blah')).toBe("'blah");
        });

        it('should not modify non-string values', () => {
            expect(escapeValue(1)).toBe(1);
            expect(escapeValue(true)).toBe(true);
            expect(escapeValue(null)).toBe(null);
            expect(escapeValue(undefined)).toBe(undefined);
            expect(escapeValue({ key: 'value' })).toEqual({ key: 'value' });
        });
    });

    describe('checkIEEE754SafeInteger', () => {
        it('should accept zero as a safe integer', () => {
            expect(() => checkIEEE754SafeInteger(0)).not.toThrow();
        });

        it('should accept integers within safe bounds', () => {
            // Test lower bound: -(2^53)
            expect(() => checkIEEE754SafeInteger(-9007199254740991)).not.toThrow();

            // Test upper bound: 2^53
            expect(() => checkIEEE754SafeInteger(9007199254740991)).not.toThrow();

            // Test some regular integers
            expect(() => checkIEEE754SafeInteger(42)).not.toThrow();
            expect(() => checkIEEE754SafeInteger(-42)).not.toThrow();
        });

        it('should reject integers outside safe bounds', () => {
            // Test below lower bound: -(2^53) - 1
            expect(() => checkIEEE754SafeInteger(-9007199254740993)).toThrow(IEEE754SafeIntegerError);

            // Test above upper bound: (2^53) + 1
            expect(() => checkIEEE754SafeInteger(9007199254740993)).toThrow(IEEE754SafeIntegerError);
        });

        it('should ignore non-numeric values', () => {
            expect(() => checkIEEE754SafeInteger('blah')).not.toThrow();
            expect(() => checkIEEE754SafeInteger(true)).not.toThrow();
            expect(() => checkIEEE754SafeInteger([])).not.toThrow();
            expect(() => checkIEEE754SafeInteger({})).not.toThrow();
            expect(() => checkIEEE754SafeInteger(null)).not.toThrow();
            expect(() => checkIEEE754SafeInteger(undefined)).not.toThrow();
        });

        it('should reject non-integer numbers', () => {
            expect(() => checkIEEE754SafeInteger(3.14)).toThrow(IEEE754SafeIntegerError);
            expect(() => checkIEEE754SafeInteger(-2.5)).toThrow(IEEE754SafeIntegerError);
        });
    });
});
