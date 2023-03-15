import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const niivuePath = process.env.NIIVUE_PATH

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  root: './src/ui',
  resolve: {
    alias: {
      '@niivue': path.resolve(niivuePath, 'src', 'niivue.js')
    }
  },
  publicDir: './public',
  build: {
    outDir: './dist-ui',
    emptyOutDir: true,
  },
  
})
