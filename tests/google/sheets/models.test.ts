import { GoogleAuth } from 'google-auth-library';
import { Wrapper } from '../../../src/google/sheets/wrapper';
import { A1Range, RawQueryRowsResult, QueryRowsResult } from '../../../src/google/sheets/models';

describe('A1Range', () => {
    interface TestCase {
        name: string;
        input: string;
        sheetName: string;
        fromCell: string;
        toCell: string;
    }

    const testCases: TestCase[] = [
        {
            name: 'no_sheet_name_single_range',
            input: 'A1',
            sheetName: '',
            fromCell: 'A1',
            toCell: 'A1',
        },
        {
            name: 'no_sheet_name_multiple_range',
            input: 'A1:A2',
            sheetName: '',
            fromCell: 'A1',
            toCell: 'A2',
        },
        {
            name: 'has_sheet_name_single_range',
            input: 'Sheet1!A1',
            sheetName: 'Sheet1',
            fromCell: 'A1',
            toCell: 'A1',
        },
        {
            name: 'has_sheet_name_multiple_range',
            input: 'Sheet1!A1:A2',
            sheetName: 'Sheet1',
            fromCell: 'A1',
            toCell: 'A2',
        },
        {
            name: 'empty_input',
            input: '',
            sheetName: '',
            fromCell: '',
            toCell: '',
        },
    ];

    testCases.forEach(tc => {
        it(tc.name, () => {
            const a1 = new A1Range(tc.input);
            expect(a1.original).toBe(tc.input);
            expect(a1.sheetName).toBe(tc.sheetName);
            expect(a1.fromCell).toBe(tc.fromCell);
            expect(a1.toCell).toBe(tc.toCell);
        });
    });
});

describe('RawQueryRowsResult', () => {
    describe('toQueryRowsResult', () => {
        it('empty_rows', () => {
            const rawResult: RawQueryRowsResult = {
                table: {
                    cols: [
                        { id: 'A', type: 'number' },
                        { id: 'B', type: 'string' },
                    ],
                    rows: [],
                },
            };

            const expected: QueryRowsResult = { rows: [] };
            const wrapper = new Wrapper(new GoogleAuth());
            const result = wrapper['toQueryRowsResult'](rawResult);
            expect(result).toEqual(expected);
        });

        it('few_rows', () => {
            const rawResult: RawQueryRowsResult = {
                table: {
                    cols: [
                        { id: 'A', type: 'number' },
                        { id: 'B', type: 'string' },
                        { id: 'C', type: 'boolean' },
                    ],
                    rows: [
                        {
                            c: [
                                { v: 123.0, f: '123' },
                                { v: 'blah', f: 'blah' },
                                { v: true, f: 'true' },
                            ],
                        },
                        {
                            c: [
                                { v: 456.0, f: '456' },
                                { v: 'blah2', f: 'blah2' },
                                { v: false, f: 'FALSE' },
                            ],
                        },
                        {
                            c: [
                                { v: 123.1, f: '123.1' },
                                { v: 'blah', f: 'blah' },
                                { v: true, f: 'TRUE' },
                            ],
                        },
                    ],
                },
            };

            const expected: QueryRowsResult = {
                rows: [
                    [123.0, 'blah', true],
                    [456.0, 'blah2', false],
                    [123.1, 'blah', true],
                ],
            };

            const wrapper = new Wrapper(new GoogleAuth());
            const result = wrapper['toQueryRowsResult'](rawResult);
            expect(result).toEqual(expected);
        });

        it('unexpected_type', () => {
            const rawResult: RawQueryRowsResult = {
                table: {
                    cols: [
                        { id: 'A', type: 'number' },
                        { id: 'B', type: 'string' },
                        { id: 'C', type: 'something' },
                    ],
                    rows: [
                        {
                            c: [
                                { v: 123.0, f: '123' },
                                { v: 'blah', f: 'blah' },
                                { v: true, f: 'true' },
                            ],
                        },
                    ],
                },
            };

            const wrapper = new Wrapper(new GoogleAuth());
            expect(() => wrapper['toQueryRowsResult'](rawResult)).toThrow('Unsupported cell value type: something');
        });
    });
});