// Offline cache for PLC Start (installable PWA)
const C = 'plcstart-v44';
const FILES = ['./', 'index.html', 'css/app.css', 'fonts.css', 'fonts/plex-sans.woff2', 'fonts/plex-sans-italic.woff2', 'fonts/plex-sans-condensed-600.woff2', 'fonts/plex-sans-condensed-700.woff2', 'fonts/plex-mono-400.woff2', 'fonts/plex-mono-500.woff2', 'fonts/plex-mono-600.woff2', 'js/engine.js', 'js/st.js', 'js/plants.js', 'js/plants-robot.js', 'js/plants-starters.js', 'js/plants-valves.js', 'js/plants-life.js', 'js/ladderview.js', 'js/comm.js', 'js/hw-rack.js', 'js/hw-net.js', 'js/hw-online.js', 'js/hw-diag.js', 'js/hw-meter.js', 'js/hw-starters.js', 'js/hw-bits.js', 'js/hw-wiring.js', 'js/hw-hmi.js', 'js/hw-tasks.js', 'js/hw-drive.js', 'js/hw-packml.js', 'js/hw-flow.js', 'js/hw-safety.js', 'js/hw-risk.js', 'js/hw-valves.js', 'js/hw-life.js', 'js/hw-blocks.js', 'js/fbdview.js', 'js/circuit.js', 'js/circuit-ui.js', 'js/pages-extra.js', 'js/calc.js', 'js/calc-proj.js', 'js/lab-tools.js', 'js/quiz-read.js', 'js/lessons.js', 'js/challenges.js', 'js/topics.js', 'js/panels.js', 'js/app.js', 'icon.svg', 'manifest.webmanifest'];
self.addEventListener('install', (e) => e.waitUntil(caches.open(C).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== C).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then((r) => { const cp = r.clone(); if (r.ok && new URL(e.request.url).origin === location.origin) caches.open(C).then((c) => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request)));
});
