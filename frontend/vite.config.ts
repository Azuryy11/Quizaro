import { defineConfig } from 'vite'

const apiProxy = {
  '/api': {
    target: 'https://localhost',
    changeOrigin: true,
    secure: false,
  },
  '/login': {
    target: 'https://localhost',
    changeOrigin: true,
    secure: false,
  },
  '/register': {
    target: 'https://localhost',
    changeOrigin: true,
    secure: false,
  },
  '/logout': {
    target: 'https://localhost',
    changeOrigin: true,
    secure: false,
  },
  '/profile': {
    target: 'https://localhost',
    changeOrigin: true,
    secure: false,
  },
}

export default defineConfig({
  server: {
    proxy: apiProxy,
  },
  preview: {
    proxy: apiProxy,
  },
})
