# Publish the PWA over HTTPS

The application is ready for static website hosting. It has no backend, account system, API key, CDN, or paid dependency. Vite is a pinned build-time dependency. No hosting service has been contacted or configured and the app has not been published. Get the owner's permission before choosing or using an external host.

## Files to upload

For Vercel, import this GitHub repository with the project Root Directory set to the repository root (leave it blank or use `.`). `vercel.json` selects Vite, installs with `npm ci --include=dev`, builds with `npm run build`, and publishes `dist`. Use Node.js 24.x. No ZIP or local computer files are needed. Pushes to the connected main branch can trigger deployment.

To verify in Codex, run those same install and build commands. `npm run preview -- --port 8001` serves the production output for testing. Run `TEST_BASE_URL=http://127.0.0.1:8001/ node tests/browser.cjs` and `TEST_BASE_URL=http://127.0.0.1:8001/ node tests/pwa.cjs` using the existing cloud test tools.

For other static hosts, upload the contents of the generated `dist` folder, preserving the icons folder. Required runtime files:

- index.html, style.css, app.js, storage.js, ideas.js, pwa.js
- sw.js, manifest.webmanifest
- icons/apple-touch-icon.png, icons/icon-192.png, icons/icon-512.png, icons/icon-maskable-512.png

The app needs no runtime server. `vite.config.js` packages the existing static shell unchanged so the service worker keeps its fixed URLs; it does not replace the app or change features. The committed package-lock.json makes installs reproducible. `vercel.json` sets actual response headers on Vercel. `_headers` supplies recommended security and cache response headers on compatible hosts; on other hosts set equivalent headers in hosting settings. Do not upload Git metadata, tests, or personal backup files. Never put credentials in these files.

## Hosting requirements

- Serve the complete app from one stable HTTPS origin with a valid, trusted certificate; redirect HTTP to HTTPS.
- Serve `.js` as JavaScript, `.png` as image/png, and the manifest as application/manifest+json (application/json is also commonly supported).
- Serve real files, including sw.js; do not rewrite missing JavaScript or icon URLs to index.html.
- Use a dedicated origin where possible. Relative URLs also support a subdirectory such as `/planner/`; open its trailing-slash URL. Manifest identity, start URL, icons, and worker scope resolve within that folder. Browser localStorage is origin-wide, so two copies on different paths of the same origin share event storage.
- Revalidate shell files rather than caching them indefinitely. Serve sw.js with Cache-Control: no-store or no-cache. The worker manages its versioned offline cache.
- On every release, change CACHE in sw.js when any cached file changes, and upload all assets together. The new worker waits until old app windows close. This avoids forced reloads while editing. The app displays an update message when an update is waiting. An offline device gets the update on a later online visit. Worker updates never clear event storage.

## Check after publication

1. In desktop browser developer tools confirm HTTPS, valid manifest, installed service worker, and successful icon/file responses. There should be no mixed content or external application requests.
2. Open the HTTPS URL on an iPhone in Safari. Export any existing event data first. Use Share → Add to Home Screen; enable Open as Web App if shown, then Add. Launch the new icon.
3. Wait online for the first visit to finish. Under Install app the app reports when offline caching is ready. Create an event, close and reopen the app, and check it remains.
4. Turn on airplane mode, reopen the app, edit an event, and verify it still works. Export a backup to Files, then import it and check the result. Reconnect afterwards.
5. Check portrait and landscape, the on-screen keyboard, scrolling in the event dialog, shopping quantities, checkboxes, and safe areas around the notch and bottom Home indicator.
6. Test a subsequent release and verify that closing all app windows and reopening activates its new offline cache while retaining saved events.

The cloud checks used localhost (a browser secure-context exception) and Chromium iPhone emulation. They verify manifest/icon responses, touch targets, narrow layouts, and offline functionality. A trusted public HTTPS deployment, Safari, physical iPhone installation, and real iOS file sharing remain to be verified after publishing. WebKit was not installed; no software was installed for this change.

## Data and future synchronization

Data stays in localStorage under the unchanged `my-event-planner-v1` key, using `{version: 1, events: [...]}`. Existing backups still work. `storage.js` exposes the asynchronous `EventRepository.load()` / `save(snapshot)` boundary; the UI validates loaded snapshots and reports failures. Saves capture snapshots and are serialized. `app.js` owns event state and calculations; `sw.js` caches only a fixed list of application files, never event data or future API responses.

A future sync implementation can extend this repository boundary while retaining local-first saves. It will need explicit identity/authentication, record revisions, deletion tombstones, conflict resolution, migrations, and a retry queue. Existing stable event/item/task IDs provide a starting point; the current snapshot adapter is not itself a sync protocol. No network sync is currently implemented. Future endpoints would need deliberate CSP/connect-src changes.

Storage is tied to the origin, browser, and device. Desktop file mode, localhost, and the published HTTPS site have different storage. iOS browser and Home Screen storage behavior varies by version and install context: do not promise they share data. Export and import when moving. Browser data may be removed by the user or the OS; keep independent backups in Files or another safe location. Do not use Private Browsing for durable event data.


### Ideas storage and offline releases

`ideas.js` implements photo compression, gallery controls, and photo schema validation. Event records can now include an optional `ideas` array; leaving it absent preserves older event/backups. Photos are JPEG data URLs stored with their caption, category, and stable ID inside the existing local snapshot. They are included in backup JSON; no image requests or cloud uploads occur. Import validates photo URL types and waits for successful persistence before replacing current events. See README.md for limits and the suggested future object-storage upgrade.

The Ideas release bumps the service-worker shell cache to v3 and includes ideas.js in both Vite output and offline precaching. The updated worker follows the existing wait-for-closed-windows update policy. Retain app data when troubleshooting updates; do not clear site storage to refresh the shell.
