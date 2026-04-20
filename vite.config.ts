import electron from 'vite-plugin-electron/simple'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const electronExternal = ['electron-store', 'mssql', '@github/copilot-sdk']

export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          build: {
            rollupOptions: {
              external: electronExternal,
            },
          },
        },
      },
      preload: {
        input: 'electron/preload.ts',
        vite: {
          build: {
            rollupOptions: {
              external: electronExternal,
            },
          },
        },
      },
    }),
  ],
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('monaco-editor') || id.includes('@monaco-editor/react')) {
            return 'monaco'
          }

          if (id.includes('@mui/x-data-grid')) {
            return 'data-grid'
          }

          if (id.includes('@mui/x-tree-view')) {
            return 'tree-view'
          }

          if (
            id.includes('@mui/material') ||
            id.includes('@mui/icons-material')
          ) {
            return 'material'
          }

          if (id.includes('react-resizable-panels')) {
            return 'layout'
          }

          return undefined
        },
      },
    },
  },
})
