import { ColsMapping } from '../../../src/google/utils/range';
import {
    getA1Range,
    generateColumnName,
    generateColumnMapping,
    ColIdx,
} from '../../../src/google/utils/range';

describe('range', () => {
    describe('getA1Range', () => {
        it('should correctly combine sheet name and range', () => {
            expect(getA1Range('sheet', 'A1:A50')).toBe('sheet!A1:A50');
            expect(getA1Range('sheet', 'A1')).toBe('sheet!A1');
            expect(getA1Range('sheet', 'A')).toBe('sheet!A');
        });
    });

    describe('generateColumnName', () => {
        interface TestCase {
            name: string;
            input: number;
            expected: string;
        }

        const testCases: TestCase[] = [
            {
                name: 'zero',
                input: 0,
                expected: 'A',
            },
            {
                name: 'single_character',
                input: 15,
                expected: 'P',
            },
            {
                name: 'single_character_2',
                input: 25,
                expected: 'Z',
            },
            {
                name: 'single_character_3',
                input: 5,
                expected: 'F',
            },
            {
                name: 'double_character',
                input: 26,
                expected: 'AA',
            },
            {
                name: 'double_character_2',
                input: 52,
                expected: 'BA',
            },
            {
                name: 'double_character_3',
                input: 89,
                expected: 'CL',
            },
            {
                name: 'max_column',
                input: 18277,
                expected: 'ZZZ',
            },
        ];

        testCases.forEach(tc => {
            it(tc.name, () => {
                expect(generateColumnName(tc.input)).toBe(tc.expected);
            });
        });
    });

    describe('generateColumnMapping', () => {
        interface TestCase {
            name: string;
            input: string[];
            expected: Map<string, ColIdx>;
        }

        const testCases: TestCase[] = [
            {
                name: 'single_column',
                input: ['col1'],
                expected: new Map([
                    ['col1', { name: 'A', idx: 0 }],
                ]),
            },
            {
                name: 'three_column',
                input: ['col1', 'col2', 'col3'],
                expected: new Map([
                    ['col1', { name: 'A', idx: 0 }],
                    ['col2', { name: 'B', idx: 1 }],
                    ['col3', { name: 'C', idx: 2 }],
                ]),
            },
            {
                name: 'many_column',
                input: [
                    'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10',
                    'c11', 'c12', 'c13', 'c14', 'c15', 'c16', 'c17', 'c18', 'c19', 'c20',
                    'c21', 'c22', 'c23', 'c24', 'c25', 'c26', 'c27', 'c28',
                ],
                expected: new Map([
                    ['c1', { name: 'A', idx: 0 }], ['c2', { name: 'B', idx: 1 }],
                    ['c3', { name: 'C', idx: 2 }], ['c4', { name: 'D', idx: 3 }],
                    ['c5', { name: 'E', idx: 4 }], ['c6', { name: 'F', idx: 5 }],
                    ['c7', { name: 'G', idx: 6 }], ['c8', { name: 'H', idx: 7 }],
                    ['c9', { name: 'I', idx: 8 }], ['c10', { name: 'J', idx: 9 }],
                    ['c11', { name: 'K', idx: 10 }], ['c12', { name: 'L', idx: 11 }],
                    ['c13', { name: 'M', idx: 12 }], ['c14', { name: 'N', idx: 13 }],
                    ['c15', { name: 'O', idx: 14 }], ['c16', { name: 'P', idx: 15 }],
                    ['c17', { name: 'Q', idx: 16 }], ['c18', { name: 'R', idx: 17 }],
                    ['c19', { name: 'S', idx: 18 }], ['c20', { name: 'T', idx: 19 }],
                    ['c21', { name: 'U', idx: 20 }], ['c22', { name: 'V', idx: 21 }],
                    ['c23', { name: 'W', idx: 22 }], ['c24', { name: 'X', idx: 23 }],
                    ['c25', { name: 'Y', idx: 24 }], ['c26', { name: 'Z', idx: 25 }],
                    ['c27', { name: 'AA', idx: 26 }], ['c28', { name: 'AB', idx: 27 }],
                ]),
            },
        ];

        testCases.forEach(tc => {
            it(tc.name, () => {
                expect(generateColumnMapping(tc.input)).toEqual(new ColsMapping(tc.expected));
            });
        });
    });
});
