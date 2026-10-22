import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

// https://vite.dev/config/
// El plugin de Cloudflare ejecuta el Worker (/api/*) dentro de `npm run dev`,
// así frontend y API corren juntos igual que en producción.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    cloudflare(),
  ],
})
