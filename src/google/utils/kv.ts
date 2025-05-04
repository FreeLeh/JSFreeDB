/**
 * Defines the mode of the key value store.
 * For more details, please read the README file.
 */
export enum KVMode {
    Default = 0,
    AppendOnly = 1
}

/**
 * Constants for special values in the key-value store
 */
export const NAValue = "#N/A";
export const ErrorValue = "#ERROR!";

/**
 * Error class for when a key is not found in the key-value store
 */
export class KeyNotFoundError extends Error {
    constructor() {
        super("error key not found");
        this.name = "KeyNotFoundError";
    }
}
