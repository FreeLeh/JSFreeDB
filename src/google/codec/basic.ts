import { Codec } from './base';

export class BasicCodec implements Codec {
    /**
     * This class performs encoding and decoding by adding an exclamation as a prefix into the raw data.
     */
    private static readonly PREFIX: string = '!';

    /**
     * Encode performs data encoding by adding an exclamation mark in front of the data.
     *
     * @param data - The raw string data provided by the client.
     * @returns The encoded data in string format.
     */
    public encode(data: string): string {
        return BasicCodec.PREFIX + data;
    }

    /**
     * Decodes data that was encoded using `encode`.
     * @param data the encoded data to decode
     * @returns the decoded data
     * @throws Error if the data is empty or malformed
     */
    public decode(data: string): string {
        if (!data) {
            throw new Error("data can't be empty");
        }
        if (!data.startsWith(BasicCodec.PREFIX)) {
            throw new Error("malformed data");
        }
        return data.substring(1);
    }
}
