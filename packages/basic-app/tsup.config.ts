export default {
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  external: ['react', 'react-dom', '@mui/material', '@emotion/react', '@emotion/styled']
}
