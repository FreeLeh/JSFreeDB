import { AuthClient } from '../../../src/google/auth/base'
import { Wrapper } from '../../../src/google/sheets/wrapper';
import { sheets_v4 } from 'googleapis';
import { AppendMode, A1Range } from '../../../src/google/sheets/models';

jest.mock('googleapis', () => ({
    google: {
        sheets: jest.fn(() => ({
            spreadsheets: {
                create: jest.fn(),
                batchUpdate: jest.fn(),
                values: {
                    append: jest.fn(),
                    update: jest.fn(),
                    batchUpdate: jest.fn(),
                    batchClear: jest.fn()
                }
            }
        }))
    }
}));

describe('Wrapper', () => {
    let wrapper: Wrapper;
    let mockAuth: AuthClient;
    let mockSheetsService: jest.Mocked<sheets_v4.Sheets>;

    beforeEach(() => {
        mockAuth = { getAuth: jest.fn() };
        wrapper = new Wrapper(mockAuth);
        mockSheetsService = wrapper['service'] as unknown as jest.Mocked<sheets_v4.Sheets>;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createSpreadsheet', () => {
        it('successful', async () => {
            const mockResponse = {
                data: {
                    spreadsheetId: '123'
                }
            };

            mockSheetsService.spreadsheets.create = jest.fn().mockResolvedValueOnce(mockResponse);

            const sid = await wrapper.createSpreadsheet('title');

            expect(mockSheetsService.spreadsheets.create).toHaveBeenCalledWith({
                requestBody: {
                    properties: { title: 'title' }
                }
            });
            expect(sid).toBe('123');
        });

        it('http500', async () => {
            mockSheetsService.spreadsheets.create = jest.fn().mockRejectedValueOnce(
                new Error('Internal Server Error')
            );

            await expect(wrapper.createSpreadsheet('title')).rejects.toThrow();
        });

        it('empty_title', async () => {
            const mockResponse = {
                data: {
                    spreadsheetId: '123'
                }
            };

            mockSheetsService.spreadsheets.create = jest.fn().mockResolvedValueOnce(mockResponse);

            const sid = await wrapper.createSpreadsheet('');
            expect(sid).toBe('123');
            expect(mockSheetsService.spreadsheets.create).toHaveBeenCalledWith({
                requestBody: {
                    properties: { title: '' }
                }
            });
        });
    });

    describe('createSheet', () => {
        it('successful', async () => {
            const expectedRequest = {
                spreadsheetId: '123',
                requestBody: {
                    requests: [{
                        addSheet: {
                            properties: {
                                title: 'sheet'
                            }
                        }
                    }]
                }
            };

            const mockResponse = {
                data: {
                    spreadsheetId: '123',
                    replies: [{
                        addSheet: {
                            properties: {
                                title: 'sheet'
                            }
                        }
                    }]
                }
            };

            mockSheetsService.spreadsheets.batchUpdate = jest.fn().mockResolvedValueOnce(mockResponse);

            await wrapper.createSheet('123', 'sheet');

            expect(mockSheetsService.spreadsheets.batchUpdate).toHaveBeenCalledWith(expectedRequest);
        });

        it('http500', async () => {
            mockSheetsService.spreadsheets.batchUpdate = jest.fn().mockRejectedValueOnce(
                new Error('Internal Server Error')
            );

            await expect(wrapper.createSheet('123', 'sheet')).rejects.toThrow();
        });

        it('empty_title', async () => {
            const expectedRequest = {
                spreadsheetId: '123',
                requestBody: {
                    requests: [{
                        addSheet: {
                            properties: {
                                title: ''
                            }
                        }
                    }]
                }
            };

            const mockResponse = {
                data: {
                    spreadsheetId: '123',
                    replies: [{
                        addSheet: {
                            properties: {
                                title: 'untitled'
                            }
                        }
                    }]
                }
            };

            mockSheetsService.spreadsheets.batchUpdate = jest.fn().mockResolvedValueOnce(mockResponse);

            await wrapper.createSheet('123', '');

            expect(mockSheetsService.spreadsheets.batchUpdate).toHaveBeenCalledWith(expectedRequest);
        });
    });

    describe('insertRows', () => {
        it('successful', async () => {
            const values = [['1', '2'], ['3', '4']];
            const expectedRequest = {
                spreadsheetId: '123',
                range: 'Sheet1!A1:A2',
                insertDataOption: AppendMode.OVERWRITE,
                includeValuesInResponse: true,
                responseValueRenderOption: 'FORMATTED_VALUE',
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    majorDimension: 'ROWS',
                    range: 'Sheet1!A1:A2',
                    values
                }
            };

            const mockResponse = {
                data: {
                    spreadsheetId: '123',
                    tableRange: 'Sheet1!A1:A2',
                    updates: {
                        spreadsheetId: '123',
                        updatedRange: 'Sheet1!A1:B3',
                        updatedRows: 2,
                        updatedColumns: 2,
                        updatedCells: 4,
                        updatedData: {
                            range: 'Sheet1!A1:B3',
                            majorDimension: 'ROWS',
                            values
                        }
                    }
                }
            };

            mockSheetsService.spreadsheets.values.append = jest.fn().mockResolvedValueOnce(mockResponse);

            const result = await wrapper['internalInsertRows']('123', 'Sheet1!A1:A2', values, AppendMode.OVERWRITE);

            expect(mockSheetsService.spreadsheets.values.append).toHaveBeenCalledWith(expectedRequest);
            expect(result.updatedRange.original).toBe('Sheet1!A1:B3');
            expect(result.updatedRows).toBe(2);
            expect(result.updatedColumns).toBe(2);
            expect(result.updatedCells).toBe(4);
            expect(result.insertedValues).toEqual(values);
        });

        it('http500', async () => {
            const values = [['1', '2'], ['3', '4']];
            mockSheetsService.spreadsheets.values.append = jest.fn().mockRejectedValueOnce(
                new Error('Internal Server Error')
            );

            await expect(
                wrapper['internalInsertRows']('123', 'Sheet1!A1:A2', values, AppendMode.OVERWRITE)
            ).rejects.toThrow();
        });
    });

    describe('updateRows', () => {
        it('successful', async () => {
            const values = [['1', '2'], ['3', '4']];
            const expectedRequest = {
                spreadsheetId: '123',
                range: 'Sheet1!A1:A2',
                includeValuesInResponse: true,
                responseValueRenderOption: 'FORMATTED_VALUE',
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    majorDimension: 'ROWS',
                    range: 'Sheet1!A1:A2',
                    values
                }
            };

            const mockResponse = {
                data: {
                    spreadsheetId: '123',
                    updatedRange: 'Sheet1!A1:B3',
                    updatedRows: 2,
                    updatedColumns: 2,
                    updatedCells: 4,
                    updatedData: {
                        range: 'Sheet1!A1:B3',
                        majorDimension: 'ROWS',
                        values
                    }
                }
            };

            mockSheetsService.spreadsheets.values.update = jest.fn().mockResolvedValueOnce(mockResponse);

            const result = await wrapper.updateRows('123', 'Sheet1!A1:A2', values);

            expect(mockSheetsService.spreadsheets.values.update).toHaveBeenCalledWith(expectedRequest);
            expect(result.updatedRange.original).toBe('Sheet1!A1:B3');
            expect(result.updatedRows).toBe(2);
            expect(result.updatedColumns).toBe(2);
            expect(result.updatedCells).toBe(4);
            expect(result.updatedValues).toEqual(values);
        });

        it('http500', async () => {
            const values = [['1', '2'], ['3', '4']];
            mockSheetsService.spreadsheets.values.update = jest.fn().mockRejectedValueOnce(
                new Error('Internal Server Error')
            );

            await expect(
                wrapper.updateRows('123', 'Sheet1!A1:A2', values)
            ).rejects.toThrow();
        });
    });

    describe('batchUpdateRows', () => {
        it('successful', async () => {
            const requests = [
                {
                    a1Range: 'Sheet1!A1:A2',
                    values: [['VA1'], ['VA2']]
                },
                {
                    a1Range: 'Sheet1!B1:B2',
                    values: [['VB1'], ['VB2']]
                }
            ];

            const expectedRequest = {
                spreadsheetId: '123',
                requestBody: {
                    data: [
                        {
                            majorDimension: 'ROWS',
                            range: 'Sheet1!A1:A2',
                            values: [['VA1'], ['VA2']]
                        },
                        {
                            majorDimension: 'ROWS',
                            range: 'Sheet1!B1:B2',
                            values: [['VB1'], ['VB2']]
                        }
                    ],
                    includeValuesInResponse: true,
                    responseValueRenderOption: 'FORMATTED_VALUE',
                    valueInputOption: 'USER_ENTERED'
                }
            };

            const mockResponse = {
                data: {
                    responses: [
                        {
                            spreadsheetId: '123',
                            updatedRange: 'Sheet1!A1:A2',
                            updatedRows: 2,
                            updatedColumns: 1,
                            updatedCells: 2,
                            updatedData: {
                                range: 'Sheet1!A1:A2',
                                majorDimension: 'ROWS',
                                values: [['VA1'], ['VA2']]
                            }
                        },
                        {
                            spreadsheetId: '123',
                            updatedRange: 'Sheet1!B1:B2',
                            updatedRows: 2,
                            updatedColumns: 1,
                            updatedCells: 2,
                            updatedData: {
                                range: 'Sheet1!B1:B2',
                                majorDimension: 'ROWS',
                                values: [['VB1'], ['VB2']]
                            }
                        }
                    ]
                }
            };

            const expectedResult = [
                {
                    updatedRange: new A1Range('Sheet1!A1:A2'),
                    updatedRows: 2,
                    updatedColumns: 1,
                    updatedCells: 2,
                    updatedValues: [['VA1'], ['VA2']]
                },
                {
                    updatedRange: new A1Range('Sheet1!B1:B2'),
                    updatedRows: 2,
                    updatedColumns: 1,
                    updatedCells: 2,
                    updatedValues: [['VB1'], ['VB2']]
                }
            ];

            mockSheetsService.spreadsheets.values.batchUpdate = jest.fn().mockResolvedValueOnce(mockResponse);

            const result = await wrapper.batchUpdateRows('123', requests);

            expect(mockSheetsService.spreadsheets.values.batchUpdate).toHaveBeenCalledWith(expectedRequest);
            expect(result).toEqual(expectedResult);
        });

        it('http500', async () => {
            const requests = [
                {
                    a1Range: 'Sheet1!A1:A2',
                    values: [['VA1'], ['VA2']]
                },
                {
                    a1Range: 'Sheet1!B1:B2',
                    values: [['VB1'], ['VB2']]
                }
            ];

            mockSheetsService.spreadsheets.values.batchUpdate = jest.fn().mockRejectedValueOnce(
                new Error('Internal Server Error')
            );

            await expect(wrapper.batchUpdateRows('123', requests)).rejects.toThrow();
        });
    });

    describe('clear', () => {
        it('successful', async () => {
            const ranges = ['Sheet1!A1:B3', 'Sheet1!B4:C5'];
            const expectedRequest = {
                spreadsheetId: '123',
                requestBody: {
                    ranges
                }
            };

            const mockResponse = {
                data: {
                    spreadsheetId: '123',
                    clearedRanges: ranges
                }
            };

            mockSheetsService.spreadsheets.values.batchClear = jest.fn().mockResolvedValueOnce(mockResponse);

            const result = await wrapper.clear('123', ranges);

            expect(mockSheetsService.spreadsheets.values.batchClear).toHaveBeenCalledWith(expectedRequest);
            expect(result).toEqual(ranges);
        });

        it('http500', async () => {
            const ranges = ['Sheet1!A1:B3', 'Sheet1!B4:C5'];

            mockSheetsService.spreadsheets.values.batchClear = jest.fn().mockRejectedValueOnce(
                new Error('Internal Server Error')
            );

            await expect(wrapper.clear('123', ranges)).rejects.toThrow();
        });
    });

    describe('queryRows', () => {
        it('successful', async () => {
            const mockResponse = {
                data: {
                    table: {
                        cols: [
                            { id: 'A', type: 'string' },
                            { id: 'B', type: 'number', pattern: 'General' }
                        ],
                        rows: [
                            {
                                c: [
                                    { v: 'k1' },
                                    { v: 103.51, f: '103.51' }
                                ]
                            },
                            {
                                c: [
                                    { v: 'k2' },
                                    { v: 111.0, f: '111' }
                                ]
                            },
                            {
                                c: [
                                    { v: 'k3' },
                                    { v: 123.0, f: '123' }
                                ]
                            }
                        ]
                    }
                }
            };

            const expectedResult = {
                rows: [
                    ['k1', 103.51],
                    ['k2', 111.0],
                    ['k3', 123.0]
                ]
            };

            wrapper['execQueryRows'] = jest.fn().mockResolvedValueOnce(mockResponse.data);

            const result = await wrapper.queryRows('spreadsheetId', 'sheet1', 'select A, B', true);
            expect(result).toEqual(expectedResult);
        });
    });
});
