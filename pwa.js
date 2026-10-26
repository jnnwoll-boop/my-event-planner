'use strict';
const installHelp = document.querySelector('#installHelp');
document.querySelector('#install').onclick = () => installHelp.showModal();
document.querySelector('#closeInstall').onclick = () => installHelp.close();
const offlineStatus = document.querySelector('#connection');
function connectionStatus() {
  offlineStatus.textContent = navigator.onLine ? 'Local data · no cloud sync' : 'Offline · changes saved on this device';
}
connectionStatus();
addEventListener('online', connectionStatus);
addEventListener('offline', connectionStatus);
if ('serviceWorker' in navigator && window.isSecureContext && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').then(registration => {
    function watch(worker) {
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          document.querySelector('#updateHint').hidden = false;
        }
      });
    }
    if (registration.waiting) document.querySelector('#updateHint').hidden = false;
    watch(registration.installing);
    registration.addEventListener('updatefound', () => watch(registration.installing));
    return navigator.serviceWorker.ready;
  }).then(() => {
    document.querySelector('#offlineReady').textContent = 'Ready for offline use after this first visit.';
  }).catch(() => {
    document.querySelector('#offlineReady').textContent = 'Offline setup failed. Reopen online to try again.';
  });
} else {
  document.querySelector('#offlineReady').textContent = 'Home Screen installation and offline caching require an HTTPS website (or localhost for testing).';
}
