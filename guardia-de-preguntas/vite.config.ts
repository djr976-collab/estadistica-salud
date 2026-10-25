/// <reference types="vitest/config" />
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Genera el Service Worker en la compilación con la lista exacta de recursos
 * a precachear y una versión derivada de su contenido. Evita depender de un
 * plugin externo y permite comprobar desde la app si la preparación offline
 * quedó completa.
 */
function offlinePrecache(): Plugin {
  return {
    name: 'guardia-offline-precache',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle).filter(
        (f) => !f.endsWith('.map') && f !== 'sw.js' && f !== 'offline-manifest.json',
      );
      const publicDir = resolve(__dirname, 'public');
      const publicFiles = ['manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
      const assets = ['./', ...[...new Set([...files, ...publicFiles])].sort().map((f) => `./${f}`)];

      const hash = createHash('sha256');
      for (const f of files) {
        const chunk = bundle[f];
        hash.update(f);
        hash.update(chunk.type === 'chunk' ? chunk.code : typeof chunk.source === 'string' ? chunk.source : Buffer.from(chunk.source));
      }
      for (const f of publicFiles) hash.update(readFileSync(resolve(publicDir, f)));
      const version = hash.digest('hex').slice(0, 12);

      const template = readFileSync(resolve(__dirname, 'src/pwa/sw-template.js'), 'utf8');
      const sw = template
        .replace('__VERSION__', version)
        .replace('__ASSETS__', JSON.stringify(assets, null, 2));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: sw });
      this.emitFile({
        type: 'asset',
        fileName: 'offline-manifest.json',
        source: JSON.stringify({ version, assets }, null, 2),
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), offlinePrecache()],
  build: {
    target: 'es2020',
    sourcemap: false,
    // Todo el banco viaja en el paquete para funcionar sin conexión (~210 kB comprimido).
    chunkSizeWarningLimit: 1000,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
