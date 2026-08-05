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
    // Throwaway build directory — CI builds and publishes it, so it is
    // gitignored rather than committed.
    outDir: '../dist',
    emptyOutDir: true,
    rolldownOptions: {
      output: {
        codeSplitting: false,
        entryFileNames: 'main.js',
        assetFileNames: (info) => info.name?.endsWith('.css') ? 'main.css' : '[name][extname]',
      },
    },
  },
})
