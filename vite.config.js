import { defineConfig } from 'vite';

// Porta fixa 5173: é a origem liberada no CORS da API
export default defineConfig({
  server: { port: 5173, strictPort: true },
});
