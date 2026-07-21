import { defineConfig } from 'vite'

// All injected by the reflect supervisor when it starts the dev server:
//  - VITE_PORT: the port reflect's control plane reverse-proxies to.
//  - VITE_BASE: reflect's proxy prefix for this project (/preview/<id>/).
const port = Number(process.env.VITE_PORT) || 5173
const base = process.env.VITE_BASE || '/'

export default defineConfig({
  base,
  server: {
    host: '0.0.0.0',
    port,
    strictPort: true,
    // hmr deliberately unconfigured: vite's client then dials the origin the
    // page was loaded from (reflect's proxy) — right host, port, and ws/wss.
    allowedHosts: true,
    watch: { usePolling: true, interval: 300 },
    // the FastAPI backend runs as a local process on the same VM. Vite matches
    // proxy keys against the UN-stripped request path, so when served under a
    // base (/preview/<id>/) the API must be proxied at the prefixed path too —
    // rewritten back down to /api/... for the backend.
    proxy: {
      '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      ...(base !== '/' && {
        [`${base}api`]: {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          rewrite: (p) => p.slice(base.length - 1),
        },
      }),
    },
  },
})
