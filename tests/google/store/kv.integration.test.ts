import { AuthClient } from '../../../src/google/auth/base'
import { ServiceAccountGoogleAuthClient } from '../../../src/google/auth/service_account'
import { GOOGLE_SHEETS_READ_WRITE } from '../../../src/google/auth/models'
import { GoogleSheetKVStore } from '../../../src/google/store/kv'
import { KVMode, KeyNotFoundError } from '../../../src/google/utils/kv'
import { getIntegrationTestInfo, deleteSheets } from './utils'

function sleep(ms: number) {
    return new Promise<void>(resolve => setTimeout(resolve, ms))
}

describe('GoogleSheetKVStore integration', () => {
    const { spreadsheetId, authJson, runIntegration } = getIntegrationTestInfo()

    if (!runIntegration) {
        it.skip('skipping integration tests – not in CI or missing env', () => { })
        return
    }

    let googleAuth: AuthClient

    beforeAll(async () => {
        googleAuth = ServiceAccountGoogleAuthClient.fromServiceAccountInfo(
            JSON.parse(authJson),
            GOOGLE_SHEETS_READ_WRITE,
        )
    })

    it('append-only mode', async () => {
        const sheetName = `integration_kv_append_only_${Date.now()}`

        let store = await GoogleSheetKVStore.create(
            googleAuth,
            spreadsheetId,
            sheetName,
            { mode: KVMode.AppendOnly }
        )

        try {
            await sleep(1000)
            await expect(store.get('k1')).rejects.toBeInstanceOf(KeyNotFoundError)

            await sleep(1000)
            await store.set('k1', 'test')

            await sleep(1000)
            const v = await store.get('k1')
            expect(v).toEqual('test')

            await sleep(1000)
            await store.delete('k1')

            await sleep(1000)
            await expect(store.get('k1')).rejects.toBeInstanceOf(KeyNotFoundError)
        } finally {
            await sleep(1000)
            await deleteSheets(store['rowStore'].getWrapper(), spreadsheetId, [sheetName])
        }
    }, 60000)

    it('default mode', async () => {
        const sheetName = `integration_kv_default_${Date.now()}`

        let store = await GoogleSheetKVStore.create(
            googleAuth,
            spreadsheetId,
            sheetName,
            { mode: KVMode.Default }
        )

        try {
            await sleep(1000)
            await expect(store.get('k1')).rejects.toBeInstanceOf(KeyNotFoundError)

            await sleep(1000)
            await store.set('k1', 'test')

            await sleep(1000)
            expect(await store.get('k1')).toEqual('test')

            await sleep(1000)
            await store.set('k1', 'test2')

            await sleep(1000)
            expect(await store.get('k1')).toEqual('test2')

            await sleep(1000)
            await store.delete('k1')

            await sleep(1000)
            await expect(store.get('k1')).rejects.toBeInstanceOf(KeyNotFoundError)
        } finally {
            await sleep(1000)
            await deleteSheets(store['rowStore'].getWrapper(), spreadsheetId, [sheetName])
        }
    }, 60000)
})