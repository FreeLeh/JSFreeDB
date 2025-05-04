import { GoogleAuth } from 'google-auth-library';

import { GoogleSheetRowStore, GoogleSheetRowStoreConfig } from './row';
import { KVMode, KeyNotFoundError } from '../utils/kv';
import { Codec } from '../codec/base';
import { BasicCodec } from '../codec/basic';
import { OrderBy } from '../utils/row';

interface GoogleSheetKVStoreConfig {
    mode: KVMode;
}

interface GoogleSheetKVStoreRow {
    key: string
    value: string
}

export class GoogleSheetKVStore {
    private rowStore: GoogleSheetRowStore
    private mode: KVMode
    private codec: Codec

    constructor(rowStore: GoogleSheetRowStore, mode: KVMode, codec: Codec) {
        this.rowStore = rowStore
        this.mode = mode
        this.codec = codec
    }

    async get(key: string): Promise<any> {
        let rawRows: Record<string, any>[]
        if (this.mode === KVMode.Default) {
            rawRows = await this.rowStore.select('value')
                .where('key = ?', key)
                .limit(1)
                .exec();
        } else {
            rawRows = await this.rowStore.select('value')
                .where('key = ?', key)
                .orderBy([{ column: '_rid', orderBy: OrderBy.DESC }])
                .limit(1)
                .exec();
        }
        if (rawRows.length === 0 || rawRows[0]!.value === '') {
            throw new KeyNotFoundError();
        }

        return this.codec.decode(rawRows[0]!.value);
    }

    async set(key: string, value: any): Promise<void> {
        const encoded = await this.codec.encode(value);
        const row: GoogleSheetKVStoreRow = { key, value: encoded };
        await this.rowStore.insert(row).exec();
    }

    async delete(key: string): Promise<void> {
        if (this.mode === KVMode.Default) {
            await this.rowStore.delete()
                .where('key = ?', key)
                .exec();
        } else {
            const row: GoogleSheetKVStoreRow = { key, value: '' };
            await this.rowStore.insert(row).exec();
        }
    }

    static async create(
        auth: GoogleAuth,
        spreadsheetId: string,
        sheetName: string,
        config: GoogleSheetKVStoreConfig,
    ): Promise<GoogleSheetKVStore> {
        const rowStoreConfig = new GoogleSheetRowStoreConfig(['key', 'value']);
        const rowStore = await GoogleSheetRowStore.create(auth, spreadsheetId, sheetName, rowStoreConfig);
        return new GoogleSheetKVStore(rowStore, config.mode, new BasicCodec());
    }
}