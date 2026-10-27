import { defineConfig } from 'vite';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const shellFiles = [
  'index.html', 'style.css', 'ideas.js', 'tasks.js', 'app.js', 'storage.js', 'pwa.js', 'sw.js',
  'manifest.webmanifest', '_headers',
  ...readdirSync(new URL('./icons/', import.meta.url)).map(name => `icons/${name}`)
];

export default defineConfig({
  root,
  base: './',
  publicDir: false,
  plugins: [{
    name: 'event-planner-static-shell',
    apply: 'build',
    // The existing app uses classic scripts and a service worker with fixed URLs.
    // Package those files unchanged instead of rewriting them into hashed bundles.
    resolveId(id) { if (id === 'virtual:event-planner-shell') return '\0event-planner-shell'; },
    load(id) { if (id === '\0event-planner-shell') return 'export {};'; },
    generateBundle(_options, bundle) {
      for (const name of Object.keys(bundle)) delete bundle[name];
      for (const name of shellFiles) {
        this.emitFile({type: 'asset', fileName: name, source: readFileSync(new URL(name, import.meta.url))});
      }
    }
  }],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rolldownOptions: { input: 'virtual:event-planner-shell' }
  }
});
