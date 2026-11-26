import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const target = process.env.OPENNOTES_API ?? 'http://127.0.0.1:8080'
const proxy = { '/v1': { target, ws: true }, '/mcp': target }

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: { proxy },
  preview: { proxy },
})
