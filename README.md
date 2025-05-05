# JSFreeDB
<br />

<div align="center">
	<picture>
		<source media="(prefers-color-scheme: dark)" srcset="docs/img/logo_dark.png">
		<img width=200 src="docs/img/logo_light.png">
	</picture>
	<h3><i>Ship Faster with Google Sheets as a Database!</i></h3>
</div>

<p align="center">
	<code>JSFreeDB</code> is a JavaScript library that provides common and simple database abstractions on top of Google Sheets.
</p>

<br />

<div align="center">

  ![Unit Test](https://github.com/FreeLeh/JSFreeDB/actions/workflows/unit_test.yml/badge.svg)
  ![Integration Test](https://github.com/FreeLeh/JSFreeDB/actions/workflows/full_test.yml/badge.svg)
  ![Coverage](https://img.shields.io/badge/Coverage-82.8%25-brightgreen)

</div>

## Features

1. Provide a straightforward **key-value** and **row based database** interfaces on top of Google Sheets.
2. Serve your data **without any server setup** (by leveraging Google Sheets infrastructure).
3. Support **flexible enough query language** to perform various data queries.
4. **Manually manipulate data** via the familiar Google Sheets UI (no admin page required).

> For more details, please read [our analysis](https://github.com/FreeLeh/docs/blob/main/freedb/alternatives.md#why-should-you-choose-freedb)
> on other alternatives and how it compares with `FreeDB`.

## Table of Contents

* [Protocols](#protocols)
* [Getting Started](#getting-started)
  * [Installation](#installation)
  * [Pre-requisites](#pre-requisites)
* [Row Store](#row-store)
  * [Querying Rows](#querying-rows)
  * [Counting Rows](#counting-rows)
  * [Inserting Rows](#inserting-rows)
  * [Updating Rows](#updating-rows)
  * [Deleting Rows](#deleting-rows)
  * [Struct Field to Column Mapping](#struct-field-to-column-mapping)
* [KV Store](#kv-store)
  * [Get Value](#get-value)
  * [Set Key](#set-key)
  * [Delete Key](#delete-key)
  * [Supported Modes](#supported-modes)
* [KV Store V2](#kv-store-v2)
  * [Get Value](#get-value-v2)
  * [Set Key](#set-key-v2)
  * [Delete Key](#delete-key-v2)
  * [Supported Modes](#supported-modes-v2)

## Protocols

Clients are strongly encouraged to read through the **[protocols document](https://github.com/FreeLeh/docs/blob/main/freedb/protocols.md)** to see how things work
under the hood and **the limitations**.

## Getting Started

### Installation

```
npm install jsfreedb
```

### Pre-requisites

1. Obtain a Google [OAuth2](https://github.com/FreeLeh/docs/blob/main/google/authentication.md#oauth2-flow) or [Service Account](https://github.com/FreeLeh/docs/blob/main/google/authentication.md#service-account-flow) credentials.
2. Prepare a Google Sheets spreadsheet where the data will be stored.

## Row Store

Let's assume each row in the table is represented by the `Person` interface.

```typescript
interface Person {
    name: string;
    age: number;
}
```

```typescript
import { ServiceAccountGoogleAuthClient } from 'jsfreedb/google/auth/service_account';
import { GOOGLE_SHEETS_READ_WRITE } from 'jsfreedb/google/auth/models';
import { GoogleSheetRowStore, GoogleSheetRowStoreConfig } from 'jsfreedb/google/store/row';

// If using Google Service Account.
const auth = ServiceAccountGoogleAuthClient.fromServiceAccountFile(
    "<path_to_service_account_json>",
    GOOGLE_SHEETS_READ_WRITE
);

// If using Google OAuth2 Flow.
// const auth = OAuth2GoogleAuthClient.fromClientSecretFile(
//     "<path_to_client_secret_json>",
//     "<path_to_cached_credentials_json>",
//     GOOGLE_SHEETS_READ_WRITE
// );

const store = await GoogleSheetRowStore.create(
    auth,
    "<spreadsheet_id>",
    "<sheet_name>",
    new GoogleSheetRowStoreConfig(["name", "age"])
);
```

### Querying Rows

```typescript
// Output variable
let output: Person[];

// Select all columns for all rows
output = await store.select().exec();

// Select a few columns for all rows (non-selected fields will have default value)
output = await store.select("name").exec();

// Select rows with conditions
output = await store.select()
    .where("name = ? OR age >= ?", "freedb", 10)
    .exec();

// Select rows with sorting/order by
const ordering = [
    { column: "name", orderBy: "ASC" },
    { column: "age", orderBy: "DESC" }
];
output = await store.select()
    .orderBy(ordering)
    .exec();

// Select rows with offset and limit
output = await store.select()
    .offset(10)
    .limit(20)
    .exec();
```

### Counting Rows

```typescript
// Count all rows
const count = await store.count().exec();

// Count rows with conditions
const count = await store.count()
    .where("name = ? OR age >= ?", "freedb", 10)
    .exec();
```

### Inserting Rows

```typescript
await store.insert(
    { name: "freedb", age: 10 },
    { name: "another_row", age: 20 }
).exec();
```

### Updating Rows

```typescript
const colToUpdate: Record<string, any> = {
    name: "new_name",
    age: 12
};

// Update all rows
await store.update(colToUpdate).exec();

// Update rows with conditions
await store.update(colToUpdate)
    .where("name = ? OR age >= ?", "freedb", 10)
    .exec();
```

### Deleting Rows

```typescript
// Delete all rows
await store.delete().exec();

// Delete rows with conditions
await store.delete()
    .where("name = ? OR age >= ?", "freedb", 10)
    .exec();
```

### Struct Field to Column Mapping

In TypeScript, you can define interfaces or classes to represent your data structure. The column names in the Google Sheet should match the property names in your interface or class.

```typescript
// This will map to the exact column name of "name" and "age".
interface Person {
    name: string;
    age: number;
}

// You can also use classes if you prefer
class PersonClass {
    constructor(
        public name: string,
        public age: number
    ) {}
}
```

## KV Store

> Please use `KV Store V2` as much as possible, especially if you are creating a new storage.

```typescript
import { ServiceAccountGoogleAuthClient } from 'jsfreedb/google/auth/service_account';
import { GOOGLE_SHEETS_READ_WRITE } from 'jsfreedb/google/auth/models';
import { GoogleSheetKVStore } from 'jsfreedb/google/store/kv';
import { KVMode } from 'jsfreedb/google/utils/kv';

// If using Google Service Account.
const auth = ServiceAccountGoogleAuthClient.fromServiceAccountFile(
    "<path_to_service_account_json>",
    GOOGLE_SHEETS_READ_WRITE
);

// If using Google OAuth2 Flow.
// const auth = OAuth2GoogleAuthClient.fromClientSecretFile(
//     "<path_to_client_secret_json>",
//     "<path_to_cached_credentials_json>",
//     GOOGLE_SHEETS_READ_WRITE
// );

const kv = await GoogleSheetKVStore.create(
    auth,
    "<spreadsheet_id>",
    "<sheet_name>",
    { mode: KVMode.AppendOnly }
);
```

### Get Value

If the key is not found, a `KeyNotFoundError` will be thrown.

```typescript
try {
    const value = await kv.get("k1");
    console.log(value);
} catch (error) {
    if (error instanceof KeyNotFoundError) {
        console.log("Key not found");
    } else {
        throw error;
    }
}
```

### Set Key

```typescript
await kv.set("k1", "some_value");
```

### Delete Key

```typescript
await kv.delete("k1");
```

### Supported Modes

> For more details on how the two modes are different, please read the [protocol document](https://github.com/FreeLeh/docs/blob/main/freedb/protocols.md).

There are 2 different modes supported:

1. Default mode.
2. Append only mode.

```typescript
// Default mode
const kv = await GoogleSheetKVStore.create(
    auth,
    "<spreadsheet_id>",
    "<sheet_name>",
    { mode: KVMode.Default }
);

// Append only mode
const kv = await GoogleSheetKVStore.create(
    auth,
    "<spreadsheet_id>",
    "<sheet_name>",
    { mode: KVMode.AppendOnly }
);
```

## KV Store V2

The KV Store V2 is implemented internally using the row store.

> The original `KV Store` was created using more complicated formulas, making it less maintainable.
> You can still use the original `KV Store` implementation, but we strongly suggest using this new `KV Store V2`.

You cannot use an existing sheet based on `KV Store` with `KV Store V2` as the sheet structure is different. 
- If you want to convert an existing sheet, just add an `_rid` column and insert the first key-value row with `1`
  and increase it by 1 until the last row.
- Remove the timestamp column as `KV Store V2` does not depend on it anymore. 

```typescript
import { ServiceAccountGoogleAuthClient } from 'jsfreedb/google/auth/service_account';
import { GOOGLE_SHEETS_READ_WRITE } from 'jsfreedb/google/auth/models';
import { GoogleSheetKVStoreV2 } from 'jsfreedb/google/store/kv_v2';
import { KVMode } from 'jsfreedb/google/utils/kv';

// If using Google Service Account.
const auth = ServiceAccountGoogleAuthClient.fromServiceAccountFile(
    "<path_to_service_account_json>",
    GOOGLE_SHEETS_READ_WRITE
);

// If using Google OAuth2 Flow.
// const auth = OAuth2GoogleAuthClient.fromClientSecretFile(
//     "<path_to_client_secret_json>",
//     "<path_to_cached_credentials_json>",
//     GOOGLE_SHEETS_READ_WRITE
// );

const kv = await GoogleSheetKVStoreV2.create(
    auth,
    "<spreadsheet_id>",
    "<sheet_name>",
    { mode: KVMode.AppendOnly }
);
```

### Get Value V2

If the key is not found, a `KeyNotFoundError` will be thrown.

```typescript
try {
    const value = await kv.get("k1");
    console.log(value);
} catch (error) {
    if (error instanceof KeyNotFoundError) {
        console.log("Key not found");
    } else {
        throw error;
    }
}
```

### Set Key V2

```typescript
await kv.set("k1", "some_value");
```

### Delete Key V2

```typescript
await kv.delete("k1");
```

### Supported Modes V2

> For more details on how the two modes are different, please read the [protocol document](https://github.com/FreeLeh/docs/blob/main/freedb/protocols.md).

There are 2 different modes supported:

1. Default mode.
2. Append only mode.

```typescript
// Default mode
const kv = await GoogleSheetKVStoreV2.create(
    auth,
    "<spreadsheet_id>",
    "<sheet_name>",
    { mode: KVMode.Default }
);

// Append only mode
const kv = await GoogleSheetKVStoreV2.create(
    auth,
    "<spreadsheet_id>",
    "<sheet_name>",
    { mode: KVMode.AppendOnly }
);
```

## License

This project is [MIT licensed](https://github.com/FreeLeh/JSFreeDB/blob/main/LICENSE).
