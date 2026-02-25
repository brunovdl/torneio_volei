import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Plugin para dev server com proxy da API de IA
// Em produção, a pasta /api é servida pelo Vercel Functions
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      // Em desenvolvimento, redireciona /api/ia para o servidor Node local
      // Para usar, crie um script de dev server separado ou use Vercel CLI: `vercel dev`
      // Por padrão, deixamos o proxy comentado e usamos o `vercel dev` para testar a IA
    },
  },
})
