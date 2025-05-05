import { AuthClient } from '../../../src/google/auth/base'
import { ServiceAccountGoogleAuthClient } from '../../../src/google/auth/service_account'
import { GOOGLE_SHEETS_READ_WRITE } from '../../../src/google/auth/models'
import { GoogleSheetRowStore, GoogleSheetRowStoreConfig } from '../../../src/google/store/row'
import {
    ROW_IDX_COL
} from '../../../src/google/store/models'
import { OrderBy } from '../../../src/google/utils/row'
import { injectTimestampCol } from '../../../src/google/store/row'
import { getIntegrationTestInfo, deleteSheets } from './utils'

function sleep(ms: number) {
    return new Promise<void>(resolve => setTimeout(resolve, ms))
}

describe('GoogleSheetRowStore integration', () => {
    const { spreadsheetId, authJson, runIntegration } = getIntegrationTestInfo()
    if (!runIntegration) {
        it.skip('skipping integration tests – missing CI env', () => { })
        return
    }

    let googleAuth: AuthClient

    beforeAll(async () => {
        googleAuth = ServiceAccountGoogleAuthClient.fromServiceAccountInfo(
            JSON.parse(authJson),
            GOOGLE_SHEETS_READ_WRITE,
        )
    }, 30000)

    it('basic CRUD and query', async () => {
        const sheetName = `integration_row_${Date.now()}`
        let store = await GoogleSheetRowStore.create(
            googleAuth,
            spreadsheetId,
            sheetName,
            new GoogleSheetRowStoreConfig(['name', 'age', 'dob'])
        )

        try {
            await sleep(1000)
            await expect(
                store
                    .count()
                    .exec()
            ).resolves.toEqual(0)

            await sleep(1000)
            await expect(
                store
                    .select('name', 'age')
                    .offset(10)
                    .limit(10)
                    .exec()
            ).resolves.toEqual([])

            await sleep(1000)
            await store.insert(
                { name: 'name1', age: 10, dob: '1999-01-01' },
                { name: 'name2', age: 11, dob: '2000-01-01' }
            ).exec()

            await sleep(1000)
            await expect(store.insert(null!).exec()).rejects.toThrow()

            await sleep(1000)
            await store.insert({
                name: 'name3',
                age: Number.MAX_SAFE_INTEGER,
                dob: '2001-01-01'
            }).exec()

            await sleep(1000)
            await store.update({ name: 'name4' })
                .where('age = ?', 10)
                .exec()

            const expected = [
                { name: 'name2', age: 11, dob: '2000-01-01' },
                { name: 'name3', age: Number.MAX_SAFE_INTEGER, dob: '2001-01-01' }
            ]

            await sleep(1000)
            const out = await store
                .select('name', 'age', 'dob')
                .where('name = ? OR name = ?', 'name2', 'name3')
                .orderBy([{ column: 'name', orderBy: OrderBy.ASC }])
                .limit(2)
                .exec()

            expect(out).toEqual(expected)

            await sleep(1000)
            const cnt = await store
                .count()
                .where('name = ? OR name = ?', 'name2', 'name3')
                .exec()
            expect(cnt).toBe(2)

            await sleep(1000)
            await store.delete()
                .where('name = ?', 'name4')
                .exec()
        } finally {
            await sleep(1000)
            await deleteSheets((store as any).wrapper, spreadsheetId, [sheetName])
        }
    }, 60000)

    it('edge cases', async () => {
        const sheetName = `integration_edge_${Date.now()}`
        let store = await GoogleSheetRowStore.create(
            googleAuth,
            spreadsheetId,
            sheetName,
            new GoogleSheetRowStoreConfig(['name', 'age', 'dob'])
        )

        try {
            await sleep(1000)
            await expect(store.insert(['name3', 12, '2001-01-01']).exec())
                .rejects.toThrow()

            await sleep(1000)
            await expect(store.insert({
                name: 'name3',
                age: Number.MAX_SAFE_INTEGER + 1,
                dob: '2001-01-01'
            }).exec()).rejects.toThrow()

            await sleep(1000)
            await store.insert(
                { name: 'name1', age: 10, dob: '1999-01-01' },
                { name: 'name2', age: 11, dob: '2000-01-01' }
            ).exec()
            await sleep(1000)

            const map = {
                name: 'name4',
                age: Number.MAX_SAFE_INTEGER + 1
            }
            await expect(store.update(map).exec()).rejects.toThrow()
        } finally {
            await sleep(1000)
            await deleteSheets((store as any).wrapper, spreadsheetId, [sheetName])
        }
    }, 60000)

    it('formula support', async () => {
        const sheetName = `integration_formula_${Date.now()}`
        let store = await GoogleSheetRowStore.create(
            googleAuth,
            spreadsheetId,
            sheetName,
            new GoogleSheetRowStoreConfig(
                ['value'],
                ['value']
            )
        )

        try {
            await sleep(1000)
            await store.insert({ value: '=ROW()-1' }).exec()

            await sleep(1000)
            const out = await store.select().exec()
            expect(out).toEqual([{ value: 1 }])

            await sleep(1000)
            await store.update({ value: '=ROW()' }).exec()

            await sleep(1000)
            const out2 = await store.select().exec()
            expect(out2).toEqual([{ value: 2 }])
        } finally {
            await sleep(1000)
            await deleteSheets((store as any).wrapper, spreadsheetId, [sheetName])
        }
    }, 60000)
})

describe('GoogleSheetRowStoreConfig', () => {
    it('empty columns', () => {
        expect(() => new GoogleSheetRowStoreConfig([]).validate())
            .toThrow()
    })

    it('too many columns', () => {
        expect(() => new GoogleSheetRowStoreConfig(
            Array.from({ length: 27 }, (_, i) => String(i))
        ).validate()).toThrow()
    })

    it('no error', () => {
        expect(() => new GoogleSheetRowStoreConfig(
            Array.from({ length: 10 }, (_, i) => String(i))
        ).validate()).not.toThrow()
    })
})

describe('injectTimestampCol', () => {
    it('injectTimestampCol prepends ROW_IDX_COL', () => {
        const cfg = new GoogleSheetRowStoreConfig(['col1', 'col2'])
        const result = injectTimestampCol(cfg)
        expect(result.columns).toEqual([ROW_IDX_COL, 'col1', 'col2'])
    })
})