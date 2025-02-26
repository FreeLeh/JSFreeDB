export interface Codec {
    encode(data: string): string;
    decode(data: string): string;
}