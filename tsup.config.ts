import { defineConfig } from 'tsup'

export default defineConfig({
    entry: ['src/index.ts'],
    outDir: 'dist',
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true, // clean output dir before building
    skipNodeModulesBundle: true, // don’t bundle deps in node_modules
    target: 'es2022',

    outExtension({ format }) {
        if (format === 'cjs') {
            return {
                js: `.cjs`,
            }
        } else {
            return {
                js: `.mjs`,
            }
        }
    },
})