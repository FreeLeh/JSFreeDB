import {
    GoogleSheetSelectStmt,
    GoogleSheetInsertStmt,
    GoogleSheetUpdateStmt,
    GoogleSheetDeleteStmt,
    GoogleSheetCountStmt,
    escapeValue,
} from '../../../src/google/store/stmt';
import { DEFAULT_ROW_FULL_TABLE_RANGE, ROW_IDX_COL, ROW_IDX_FORMULA } from '../../../src/google/store/models';
import { ColsMapping } from '../../../src/google/utils/range';
import { Wrapper } from '../../../src/google/sheets/wrapper';
import { QueryRowsResult, BatchUpdateRowsRequest } from '../../../src/google/sheets/models';
import { getA1Range } from '../../../src/google/utils/range';

describe('GoogleSheetSelectStmt', () => {
    const spreadsheetId = 'sheet_id';
    const sheetName = 'sheet_name';
    const colsWithFormula = new Set<string>();
    const config = {
        columns: [],
        columnsWithFormula: [],
    }

    describe('SQL generation', () => {
        it('should generate a basic select statement for two columns', () => {
            const cols = new Map(Object.entries({
                [ROW_IDX_COL]: { name: 'A', idx: 0 },
                col1: { name: 'B', idx: 1 },
                col2: { name: 'C', idx: 2 },
            }));
            const colsMapping = new ColsMapping(cols);
            const mockWrapper = { queryRows: jest.fn() } as unknown as Wrapper;

            const store = {
                getColsMapping: () => colsMapping,
                getWrapper: () => mockWrapper,
                getSpreadsheetId: () => spreadsheetId,
                getSheetName: () => sheetName,
                getColsWithFormula: () => colsWithFormula,
                getConfig: () => config,
            };
            const stmt = new GoogleSheetSelectStmt(store, ['col1', 'col2']);

            // Access the private QueryBuilder to verify .generate()
            const sql = (stmt as any).queryBuilder.generate();
            expect(sql).toBe('select B, C where A is not null');
        });
    });

    describe('exec()', () => {
        it('should propagate errors from the wrapper', async () => {
            const cols = new Map(Object.entries({
                [ROW_IDX_COL]: { name: 'A', idx: 0 },
                col1: { name: 'B', idx: 1 },
                col2: { name: 'C', idx: 2 },
            }));
            const colsMapping = new ColsMapping(cols);
            const mockWrapper = { queryRows: jest.fn().mockRejectedValue(new Error('some error')) } as unknown as Wrapper;

            const store = {
                getColsMapping: () => colsMapping,
                getWrapper: () => mockWrapper,
                getSpreadsheetId: () => spreadsheetId,
                getSheetName: () => sheetName,
                getColsWithFormula: () => colsWithFormula,
                getConfig: () => config,
            };
            const stmt = new GoogleSheetSelectStmt(store, ['col1', 'col2']);

            await expect(stmt.exec()).rejects.toThrow('some error');
            expect(mockWrapper.queryRows).toHaveBeenCalledWith(
                spreadsheetId,
                sheetName,
                'select B, C where A is not null',
                true
            );
        });

        it('successful select all', async () => {
            // Prepare a mapping for age & dob
            const cols = new Map(Object.entries({
                [ROW_IDX_COL]: { name: 'A', idx: 0 },
                age: { name: 'B', idx: 1 },
                dob: { name: 'C', idx: 2 },
            }));
            const colsMapping = new ColsMapping(cols);
            const rows = [
                [10, '17-01-2001'],
                [11, '18-01-2000'],
            ];
            const mockWrapper = {
                queryRows: jest.fn().mockResolvedValue({ rows } as QueryRowsResult)
            } as unknown as Wrapper;

            const store = {
                getColsMapping: () => colsMapping,
                getWrapper: () => mockWrapper,
                getSpreadsheetId: () => spreadsheetId,
                getSheetName: () => sheetName,
                getColsWithFormula: () => colsWithFormula,
                getConfig: () => config,
            };
            const stmt = new GoogleSheetSelectStmt(store, ['age', 'dob']);
            const result = await stmt.exec();

            expect(result).toEqual([
                { age: 10, dob: '17-01-2001' },
                { age: 11, dob: '18-01-2000' },
            ]);
            expect(mockWrapper.queryRows).toHaveBeenCalledWith(
                spreadsheetId,
                sheetName,
                'select B, C where A is not null',
                true
            );
        });
    });
});

describe('GoogleSheetInsertStmt', () => {
    let wrapper: jest.Mocked<Wrapper>;
    let store: any;
    let stmt: GoogleSheetInsertStmt;

    beforeEach(() => {
        wrapper = {
            overwriteRows: jest.fn().mockResolvedValue(undefined),
        } as unknown as jest.Mocked<Wrapper>;

        const cols = new Map(Object.entries({
            [ROW_IDX_COL]: { name: 'A', idx: 0 },
            name: { name: 'B', idx: 1 },
            age: { name: 'C', idx: 2 },
            dob: { name: 'D', idx: 3 },
        }));
        const config = {
            columns: ["name", "age", "dob"],
            columnsWithFormula: ["name"],
        };

        store = {
            getWrapper: () => wrapper,
            getColsMapping: () => new ColsMapping(cols),
            getColsWithFormula: () => new Set(['name']),
            getSpreadsheetId: () => 'sheet-123',
            getSheetName: () => 'MySheet',
            getConfig: () => config,
        };
        stmt = new GoogleSheetInsertStmt(store, []);
    });

    describe('convertRowToSlice', () => {
        it('throws on null or undefined', () => {
            expect(() => (stmt as any).convertRowToSlice(null)).toThrow(
                'row type must not be null'
            );
            expect(() => (stmt as any).convertRowToSlice(undefined)).toThrow(
                'row type must be an object'
            );
        });

        it('throws on non‐object values', () => {
            expect(() =>
                (stmt as any).convertRowToSlice(123 as any)
            ).toThrow('row type must be an object');
            expect(() =>
                (stmt as any).convertRowToSlice('foo' as any)
            ).toThrow('row type must be an object');
        });

        it('converts a plain object correctly', () => {
            const row = { name: 'blah', age: 10, dob: '2021' };
            const result = (stmt as any).convertRowToSlice(row);
            expect(result).toEqual([
                ROW_IDX_FORMULA,
                'blah',   // name (no formula)
                10,       // age (no formula)
                "'2021",  // dob (string → prefixed)
            ]);
        });

        it('converts a class instance correctly', () => {
            class Person {
                constructor(
                    public name: string,
                    public age: number,
                    public dob: string
                ) { }
            }
            const person = new Person('blah', 10, '2021');
            const result = (stmt as any).convertRowToSlice(person);
            expect(result).toEqual([
                ROW_IDX_FORMULA,
                'blah',
                10,
                "'2021",
            ]);
        });

        it('fills missing fields as undefined', () => {
            const partial = { name: 'blah', dob: '2021' } as any;
            const result = (stmt as any).convertRowToSlice(partial);
            expect(result).toEqual([
                ROW_IDX_FORMULA,
                'blah',
                undefined, // age missing
                "'2021",
            ]);
        });

        it('handles an object with only name', () => {
            const onlyName = { name: 'blah' };
            const result = (stmt as any).convertRowToSlice(onlyName);
            expect(result).toEqual([
                ROW_IDX_FORMULA,
                'blah',
                undefined,
                undefined,
            ]);
        });

        it('enforces IEEE-754 safe integers', () => {
            const maxSafe = Number.MAX_SAFE_INTEGER;         // 2^53-1
            const safeRow = { name: 'x', age: maxSafe, dob: '2021' };
            expect(() =>
                (stmt as any).convertRowToSlice(safeRow)
            ).not.toThrow();

            const overSafe = { name: 'x', age: maxSafe + 1, dob: '2021' };
            expect(() =>
                (stmt as any).convertRowToSlice(overSafe)
            ).toThrow();
        });
    });

    describe('exec()', () => {
        it('does nothing when there are no rows', async () => {
            const stmt = new GoogleSheetInsertStmt(store, []);
            await expect(stmt.exec()).resolves.toBeUndefined();
            expect(wrapper.overwriteRows).not.toHaveBeenCalled();
        });

        it('calls overwriteRows once with converted rows and correct args', async () => {
            const rows = [{ name: 'blah', age: 10, dob: '2021' }];
            const stmt = new GoogleSheetInsertStmt(store, rows);

            await stmt.exec();

            expect(wrapper.overwriteRows).toHaveBeenCalledTimes(1);
            const [sheetId, range, convertedRows] = wrapper.overwriteRows.mock.calls[0]!;

            expect(sheetId).toBe(store.getSpreadsheetId());
            expect(range).toBe(
                getA1Range(store.getSheetName(), DEFAULT_ROW_FULL_TABLE_RANGE)
            );
            expect(convertedRows).toEqual([
                [
                    ROW_IDX_FORMULA,
                    'blah',
                    10,
                    "'2021",
                ],
            ]);
        });

        it('propagates errors from the sheets wrapper', async () => {
            wrapper.overwriteRows.mockRejectedValueOnce(new Error('API down'));
            const stmt = new GoogleSheetInsertStmt(store, [{ name: 'x' }]);
            await expect(stmt.exec()).rejects.toThrow('API down');
        });
    });
});

describe('GoogleSheetUpdateStmt', () => {
    let wrapper: jest.Mocked<Wrapper>;
    let store: any;

    beforeEach(() => {
        wrapper = {
            queryRows: jest.fn().mockResolvedValue({ rows: [] }),
            batchUpdateRows: jest.fn().mockResolvedValue(undefined),
        } as unknown as jest.Mocked<Wrapper>;

        const cols = new Map(Object.entries({
            [ROW_IDX_COL]: { name: 'A', idx: 0 },
            name: { name: 'B', idx: 1 },
            age: { name: 'C', idx: 2 },
            dob: { name: 'D', idx: 3 },
        }));
        const config = {
            columns: ["name", "age", "dob"],
            columnsWithFormula: ["name"],
        };

        store = {
            getWrapper: () => wrapper,
            getColsMapping: () => new ColsMapping(cols),
            getColsWithFormula: () => new Set(['name']),
            getSpreadsheetId: () => 'sheet-123',
            getSheetName: () => 'MySheet',
            getConfig: () => config,
        };
    });

    describe('generateBatchUpdateRequests()', () => {
        it('generates requests for each (col, row) pair and escapes strings', () => {
            const stmt = new GoogleSheetUpdateStmt(
                store,
                {
                    name: 'name1',
                    age: 100,
                    dob: 'hello',
                },
            );

            const requests = (stmt as any).generateBatchUpdateRequests([1, 2]) as BatchUpdateRowsRequest[];
            const expected: BatchUpdateRowsRequest[] = [
                { a1Range: getA1Range('MySheet', 'B1'), values: [['name1']] },
                { a1Range: getA1Range('MySheet', 'B2'), values: [['name1']] },
                { a1Range: getA1Range('MySheet', 'C1'), values: [[100]] },
                { a1Range: getA1Range('MySheet', 'C2'), values: [[100]] },
                { a1Range: getA1Range('MySheet', 'D1'), values: [["'hello"]] },
                { a1Range: getA1Range('MySheet', 'D2'), values: [["'hello"]] },
            ];

            expect(requests).toEqual(expect.arrayContaining(expected));
            expect(requests).toHaveLength(expected.length);
        });

        it('allows up to Number.MAX_SAFE_INTEGER but rejects larger integers', () => {
            const maxSafe = Number.MAX_SAFE_INTEGER;          // 2^53-1
            const safeStmt = new GoogleSheetUpdateStmt(
                store,
                {
                    name: 'x',
                    age: maxSafe,
                },
            );
            expect(() => (safeStmt as any).generateBatchUpdateRequests([1])).not.toThrow();

            const unsafeStmt = new GoogleSheetUpdateStmt(
                store,
                {
                    name: 'x',
                    age: maxSafe + 1,
                },
            );
            expect(() => (unsafeStmt as any).generateBatchUpdateRequests([1])).toThrow();
        });
    });

    describe('exec()', () => {
        it('throws if no columns to update', async () => {
            const stmt = new GoogleSheetUpdateStmt(store, {});
            await expect(stmt.exec())
                .rejects
                .toThrow('empty colToValue, at least one column must be updated');
            expect(wrapper.queryRows).not.toHaveBeenCalled();
            expect(wrapper.batchUpdateRows).not.toHaveBeenCalled();
        });

        it('does nothing when queryRows returns no indices', async () => {
            wrapper.queryRows.mockResolvedValueOnce({ rows: [] });
            const stmt = new GoogleSheetUpdateStmt(
                store,
                {
                    name: 'foo',
                },
            );
            await expect(stmt.exec()).resolves.toBeUndefined();
            expect(wrapper.queryRows).toHaveBeenCalledTimes(1);
            expect(wrapper.batchUpdateRows).not.toHaveBeenCalled();
        });

        it('calls batchUpdateRows with correct requests when rows exist', async () => {
            // simulate two matching rows, indices [1,2]
            wrapper.queryRows.mockResolvedValueOnce({ rows: [[1], [2]] });
            const stmt = new GoogleSheetUpdateStmt(
                store,
                {
                    name: 'foo',
                },
            );

            await stmt.exec();

            expect(wrapper.queryRows).toHaveBeenCalledTimes(1);
            expect(wrapper.batchUpdateRows).toHaveBeenCalledTimes(1);

            const [sheetId, requests] = wrapper.batchUpdateRows.mock.calls[0]!;
            expect(sheetId).toBe(store.getSpreadsheetId());
            const expectedRequests: BatchUpdateRowsRequest[] = [
                { a1Range: getA1Range('MySheet', 'B1'), values: [['foo']] },
                { a1Range: getA1Range('MySheet', 'B2'), values: [['foo']] },
            ];
            expect(requests).toEqual(expectedRequests);
        });

        it('propagates errors from queryRows', async () => {
            wrapper.queryRows.mockRejectedValueOnce(new Error('query failed'));
            const stmt = new GoogleSheetUpdateStmt(
                store,
                {
                    name: 'foo',
                },
            );
            await expect(stmt.exec()).rejects.toThrow('query failed');
            expect(wrapper.batchUpdateRows).not.toHaveBeenCalled();
        });

        it('propagates errors from batchUpdateRows', async () => {
            wrapper.queryRows.mockResolvedValueOnce({ rows: [[1]] });
            wrapper.batchUpdateRows.mockRejectedValueOnce(new Error('API down'));
            const stmt = new GoogleSheetUpdateStmt(
                store,
                {
                    name: 'foo',
                },
            );
            await expect(stmt.exec()).rejects.toThrow('API down');
        });
    });
});

describe('GoogleSheetDeleteStmt', () => {
    let wrapper: jest.Mocked<Wrapper>
    let store: any;

    beforeEach(() => {
        wrapper = {
            queryRows: jest.fn().mockResolvedValue({ rows: [] } as QueryRowsResult),
            clear: jest.fn().mockResolvedValue(undefined),
        } as unknown as jest.Mocked<Wrapper>

        const cols = new Map(Object.entries({
            [ROW_IDX_COL]: { name: 'A', idx: 0 },
            name: { name: 'B', idx: 1 },
        }));
        const config = {
            columns: ["name"],
            columnsWithFormula: ["name"],
        };

        store = {
            getWrapper: () => wrapper,
            getColsMapping: () => new ColsMapping(cols),
            getColsWithFormula: () => new Set(['name']),
            getSpreadsheetId: () => 'sheet-123',
            getSheetName: () => 'MySheet',
            getConfig: () => config,
        };
    })

    it('is chainable via where()', () => {
        const stmt = new GoogleSheetDeleteStmt(store)
        expect(stmt.where('foo = ?', 1)).toBe(stmt)
    })

    it('does nothing when no rows match', async () => {
        wrapper.queryRows.mockResolvedValueOnce({ rows: [] })
        const stmt = new GoogleSheetDeleteStmt(store)
        await expect(stmt.exec()).resolves.toBeUndefined()
        expect(wrapper.clear).not.toHaveBeenCalled()
    })

    it('clears the correct ranges when rows exist', async () => {
        // simulate matching row indices 1 and 2
        wrapper.queryRows.mockResolvedValueOnce({ rows: [[1], [2]] } as QueryRowsResult)
        const stmt = new GoogleSheetDeleteStmt(store)
        await stmt.exec()

        const expectedRanges = [1, 2].map(i =>
            getA1Range(store.getSheetName(), `A${i}:Z${i}`)
        )
        expect(wrapper.clear).toHaveBeenCalledTimes(1)
        expect(wrapper.clear).toHaveBeenCalledWith(store.getSpreadsheetId(), expectedRanges)
    })

    it('propagates errors from queryRows()', async () => {
        wrapper.queryRows.mockRejectedValueOnce(new Error('query failed'))
        const stmt = new GoogleSheetDeleteStmt(store)
        await expect(stmt.exec()).rejects.toThrow('query failed')
        expect(wrapper.clear).not.toHaveBeenCalled()
    })

    it('propagates errors from clear()', async () => {
        wrapper.queryRows.mockResolvedValueOnce({ rows: [[5]] } as QueryRowsResult)
        wrapper.clear.mockRejectedValueOnce(new Error('clear failed'))
        const stmt = new GoogleSheetDeleteStmt(store)
        await expect(stmt.exec()).rejects.toThrow('clear failed')
    })
})

describe('GoogleSheetCountStmt', () => {
    let wrapper: jest.Mocked<Wrapper>;
    let store: any;

    beforeEach(() => {
        wrapper = {
            queryRows: jest.fn().mockResolvedValue({ rows: [] } as QueryRowsResult),
            clear: jest.fn().mockResolvedValue(undefined),
        } as unknown as jest.Mocked<Wrapper>

        const cols = new Map(Object.entries({
            [ROW_IDX_COL]: { name: 'A', idx: 0 },
            name: { name: 'B', idx: 1 },
        }));
        const config = {
            columns: ["name"],
            columnsWithFormula: ["name"],
        };

        store = {
            getWrapper: () => wrapper,
            getColsMapping: () => new ColsMapping(cols),
            getColsWithFormula: () => new Set(['name']),
            getSpreadsheetId: () => 'sheet-123',
            getSheetName: () => 'MySheet',
            getConfig: () => config,
        };
    })

    it('is chainable via where()', () => {
        const stmt = new GoogleSheetCountStmt(store)
        expect(stmt.where('bar > ?', 10)).toBe(stmt)
    })

    it('returns 0 when COUNT is 0', async () => {
        wrapper.queryRows.mockResolvedValueOnce({ rows: [[0]] } as QueryRowsResult)
        const stmt = new GoogleSheetCountStmt(store)
        await expect(stmt.exec()).resolves.toBe(0)
    })

    it('truncates non‐integer counts', async () => {
        wrapper.queryRows.mockResolvedValueOnce({ rows: [[5.7]] } as QueryRowsResult)
        const stmt = new GoogleSheetCountStmt(store)
        await expect(stmt.exec()).resolves.toBe(5)
    })

    it('throws if result shape is unexpected (no rows)', async () => {
        wrapper.queryRows.mockResolvedValueOnce({ rows: [] } as QueryRowsResult)
        const stmt = new GoogleSheetCountStmt(store)
        await expect(stmt.exec())
            .rejects
            .toThrow(/unexpected count result/)
    })

    it('throws if result shape is unexpected (too many cols)', async () => {
        wrapper.queryRows.mockResolvedValueOnce({ rows: [[1, 2]] } as QueryRowsResult)
        const stmt = new GoogleSheetCountStmt(store)
        await expect(stmt.exec())
            .rejects
            .toThrow(/unexpected count result/)
    })

    it('throws if raw count is not a number', async () => {
        wrapper.queryRows.mockResolvedValueOnce({ rows: [['foo']] } as QueryRowsResult)
        const stmt = new GoogleSheetCountStmt(store)
        await expect(stmt.exec())
            .rejects
            .toThrow(/invalid count type: string/)
    })

    it('propagates errors from queryRows()', async () => {
        wrapper.queryRows.mockRejectedValueOnce(new Error('db down'))
        const stmt = new GoogleSheetCountStmt(store)
        await expect(stmt.exec()).rejects.toThrow('db down')
    })
})

describe('escapeValue', () => {
    describe('when the column is NOT in colsWithFormula', () => {
        it('returns numbers unchanged', () => {
            expect(escapeValue('A', 123, new Set(['B']))).toBe(123);
        });

        it('prefixes strings with a single quote', () => {
            expect(escapeValue('A', '123', new Set(['B']))).toBe("'123");
        });
    });

    describe('when the column IS in colsWithFormula', () => {
        it('throws if the value is not a string', () => {
            expect(() => escapeValue('A', 123, new Set(['A']))).toThrowError(
                'value of column A is not a string, but expected to contain formula'
            );
        });

        it('returns the raw string when it is a string', () => {
            expect(escapeValue('A', '123', new Set(['A']))).toBe('123');
        });
    });
});