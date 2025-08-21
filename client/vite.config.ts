import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const host =
  process.env.REPL_SLUG && process.env.REPL_OWNER
    ? `${process.env.REPL_SLUG}-${process.env.REPL_OWNER}.repl.co`
    : undefined

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      react: path.resolve(__dirname, '../node_modules/react'),
      'react-dom': path.resolve(__dirname, '../node_modules/react-dom'),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    hmr: { protocol: 'wss', host, clientPort: 443 },
  },
})
