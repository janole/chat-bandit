export default {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    external: ['ulid', 'use-broadcast-ts', 'zustand']
}
