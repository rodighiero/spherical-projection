import { defineConfig } from 'vite'

export default defineConfig({
  root: 'src',
  // Relative so the same build works at any path: the dev server at
  // localhost:5173/ and GitHub Pages at /spherical-projection/.
  base: './',
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
