import { defineConfig } from 'vite'

export default defineConfig({
  root: 'src',
  base: '/spherical-projection/',
  worker: {
    rollupOptions: {
      output: {
        entryFileNames: '[name].js',
      },
    },
  },
  build: {
    outDir: '../docs',
    emptyOutDir: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        entryFileNames: 'main.js',
        assetFileNames: (info) => info.name?.endsWith('.css') ? 'main.css' : '[name][extname]',
      },
    },
  },
})
