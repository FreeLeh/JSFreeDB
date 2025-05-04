import { QueryBuilder } from '../../../src/google/store/query';
import { ridWhereClauseInterceptor } from '../../../src/google/store/stmt';
import { ROW_IDX_COL } from '../../../src/google/store/models';
import { OrderBy } from '../../../src/google/utils/row';
import { ColsMapping } from '../../../src/google/utils/range';

describe('QueryBuilder', () => {
    const colsMapping = new ColsMapping(new Map(Object.entries({
        [ROW_IDX_COL]: { name: 'A', idx: 0 },
        col1: { name: 'B', idx: 1 },
        col2: { name: 'C', idx: 2 },
    })));

    describe('basic generation', () => {
        it('should generate a basic select statement', () => {
            const builder = new QueryBuilder(colsMapping.getNameMap(), ridWhereClauseInterceptor, ['col1', 'col2']);
            const result = builder.generate();
            expect(result).toBe('select B, C where A is not null');
        });

        it('should handle unknown columns gracefully', () => {
            const builder = new QueryBuilder(colsMapping.getNameMap(), ridWhereClauseInterceptor, ['col1', 'col2', 'col3']);
            const result = builder.generate();
            expect(result).toBe('select B, C, col3 where A is not null');
        });
    });

    describe('where clause', () => {
        it('should generate with where and correct args', () => {
            const builder = new QueryBuilder(colsMapping.getNameMap(), ridWhereClauseInterceptor, ['col1', 'col2']);
            builder.where('(col1 > ? AND col2 <= ?) OR (col1 != ? AND col2 == ?)', 100, true, 'value', 3.14);
            const result = builder.generate();
            expect(result).toBe('select B, C where A is not null AND (B > 100 AND C <= true ) OR (B != "value" AND C == 3.14 )');
        });

        it('should throw if arg count does not match', () => {
            const builder = new QueryBuilder(colsMapping.getNameMap(), ridWhereClauseInterceptor, ['col1', 'col2']);
            builder.where('(col1 > ? AND col2 <= ?) OR (col1 != ? AND col2 == ?)', 100, true);
            expect(() => builder.generate()).toThrow();
        });

        it('should throw if unsupported arg type', () => {
            const builder = new QueryBuilder(colsMapping.getNameMap(), ridWhereClauseInterceptor, ['col1', 'col2']);
            builder.where('(col1 > ? AND col2 <= ?) OR (col1 != ? AND col2 == ?)', 100, true, null, []);
            expect(() => builder.generate()).toThrow();
        });
    });

    describe('limit and offset', () => {
        it('should generate with limit and offset', () => {
            const builder = new QueryBuilder(colsMapping.getNameMap(), ridWhereClauseInterceptor, ['col1', 'col2']);
            builder.limit(10).offset(100);
            const result = builder.generate();
            expect(result).toBe('select B, C where A is not null offset 100 limit 10');
        });
    });

    describe('order by', () => {
        it('should generate with order by clause', () => {
            const orderBy = [
                { column: 'col2', orderBy: OrderBy.DESC },
                { column: 'col1', orderBy: OrderBy.ASC },
            ];
            const builder = new QueryBuilder(colsMapping.getNameMap(), ridWhereClauseInterceptor, ['col1', 'col2']);
            builder.orderBy(orderBy);
            const result = builder.generate();
            expect(result).toBe('select B, C where A is not null order by C DESC, B ASC');
        });
    });

    describe('argument conversion', () => {
        it('should convert various argument types', () => {
            const builder = new QueryBuilder(colsMapping.getNameMap(), ridWhereClauseInterceptor, ['col1', 'col2']);
            const testCases = [
                { input: 1, output: '1' },
                { input: 1.5, output: '1.5' },
                { input: 'something', output: '"something"' },
                { input: 'date', output: 'date' },
                { input: 'datetime', output: 'datetime' },
                { input: 'timeofday', output: 'timeofday' },
                { input: true, output: 'true' },
                { input: new Uint8Array([115, 111, 109, 101, 116, 104, 105, 110, 103]), output: '"something"' },
            ];

            for (const c of testCases) {
                // @ts-ignore
                const result = builder['convertArg'](c.input);
                expect(result).toBe(c.output);
            }

            expect(() => builder['convertArg']({})).toThrow();
        });
    });
});