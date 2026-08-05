import { defineConfig } from 'vite'

export default defineConfig({
  root: 'src',
  base: '/spherical-projection/',
  worker: {
    rolldownOptions: {
      output: {
        entryFileNames: '[name].js',
      },
    },
  },
  build: {
    outDir: '../docs',
    emptyOutDir: false,
    rolldownOptions: {
      output: {
        codeSplitting: false,
        entryFileNames: 'main.js',
        assetFileNames: (info) => info.name?.endsWith('.css') ? 'main.css' : '[name][extname]',
      },
    },
  },
})
