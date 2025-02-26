import { BasicCodec } from "../../../src/google/codec/basic";

describe("BasicCodec", () => {
    const codec = new BasicCodec();

    it("should encode data with an exclamation prefix", () => {
        const data = "hello";
        const encoded = codec.encode(data);
        expect(encoded).toBe("!hello");
    });

    it("should decode data with an exclamation prefix", () => {
        const data = "!hello";
        const decoded = codec.decode(data);
        expect(decoded).toBe("hello");
    });

    it("should throw an error if decoding empty data", () => {
        const testFn = () => codec.decode("");
        const errorMessage = "data can't be empty";
        expect(testFn).toThrow(errorMessage);
    });

    it("should throw an error if decoding malformed data", () => {
        const testFn = () => codec.decode("hello");
        const errorMessage = "malformed data";
        expect(testFn).toThrow(errorMessage);
    });

    it("should encode and decode special characters correctly", () => {
        const data = "!@#$%^&*()_+=-";
        const encoded = codec.encode(data);
        const decoded = codec.decode(encoded);
        expect(decoded).toBe(data);
    });

    it("should handle empty string encoding and decoding", () => {
        const data = "";
        const encoded = codec.encode(data);
        expect(encoded).toBe("!");

        const decoded = codec.decode(encoded);
        expect(decoded).toBe("");
    });

    it("should handle multi exclamation mark properly", () => {
        const data = "!!";
        const encoded = codec.encode(data);
        expect(encoded).toBe("!!!");

        const decoded = codec.decode(encoded);
        expect(decoded).toBe("!!");
    });

    it("should handle longer string properly", () => {
        const data = "This is a longer test string with multiple words and spaces.";
        const encoded = codec.encode(data);
        expect(encoded).toBe(
            "!This is a longer test string with multiple words and spaces."
        );
        const decoded = codec.decode(encoded);
        expect(decoded).toBe(data);
    });
});