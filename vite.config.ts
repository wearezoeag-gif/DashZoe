import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFileSync } from 'fs'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-htaccess',
      closeBundle() {
        const htaccess = `Options -MultiViews
RewriteEngine On
RewriteBase /dashboard/
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [QSA,L]
`
        writeFileSync('dist/.htaccess', htaccess)
      }
    }
  ],
  base: '/dashboard/',
})