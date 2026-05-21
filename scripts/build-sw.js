import { copyFileSync, mkdirSync } from 'node:fs';
import { generateSW } from 'workbox-build';

mkdirSync('dist/assets/images', { recursive: true });
copyFileSync('assets/images/boss-ai-robot.png', 'dist/assets/images/boss-ai-robot.png');
copyFileSync('assets/images/map4-space.png', 'dist/assets/images/map4-space.png');
copyFileSync('assets/images/map5-race.png', 'dist/assets/images/map5-race.png');
copyFileSync('assets/images/map6-forest.png', 'dist/assets/images/map6-forest.png');

generateSW({
  swDest: 'dist/service-worker.js',
  globDirectory: 'dist',
  globPatterns: [
    '**/*.{html,js,css,png,svg}',
  ],
  skipWaiting: true,
  clientsClaim: true,
  runtimeCaching: [
    {
      urlPattern: /\/.(?:png|jpg|svg)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: {
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        },
      },
    },
    {
      urlPattern: /\.(?:js|css|html)$/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-resources',
      },
    },
  ],
});
