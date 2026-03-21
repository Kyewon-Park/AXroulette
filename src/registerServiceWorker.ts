export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const isLocalhost =
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '::1';

      if (isLocalhost) {
        console.log('skip service worker registration on localhost');
        return;
      }

      const swUrl = `${window.location.origin}/roulette/service-worker.js`;
      navigator.serviceWorker
        .register(swUrl)
        .then((reg) => console.log('service worker registered', reg.scope))
        .catch((err) => console.error('service worker registration failed', err));
    });
  }
}
