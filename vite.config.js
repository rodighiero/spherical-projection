import { defineConfig } from 'vite'

export default defineConfig({
  root: 'src',
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
