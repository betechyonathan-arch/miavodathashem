import { execSync } from 'node:child_process'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

// Sello de build visible en la app (Menú) para saber qué versión corre cada
// dispositivo: fecha + hash corto del commit.
const buildId = (() => {
  let sha = 'local'
  try {
    sha = execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    /* sin git: queda 'local' */
  }
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
  return `${stamp} · ${sha}`
})()

// Escribe /version.json en el build para que la app pueda detectar —sorteando un
// Service Worker "clavado"— que hay un deploy nuevo y forzar el refresco.
function emitVersionJson() {
  return {
    name: 'emit-version-json',
    generateBundle() {
      // @ts-expect-error — `this.emitFile` existe en el contexto del plugin de Rollup
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: buildId }) })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
  plugins: [
    emitVersionJson(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Avodah',
        short_name: 'Avodah',
        description: 'Sistema de Avodat Hashem: registra tu día, tus kabalot y tu jeshbón hanéfesh, en privado.',
        lang: 'es',
        dir: 'ltr',
        theme_color: '#12141f',
        background_color: '#12141f',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpeg,woff2}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
})
