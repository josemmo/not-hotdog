var TAG = 'not-hotdog';
var RESOURCES = [
  './',
  'manifest.json',
  'roboto-black.ttf',
  'app.css',
  'images/hotdog.png',
  'images/cross.png',
  'notification.ogg',
  'worker-installer.js',
  'tensorflow.js',
  'app.js',
  'model/mobilenet.json',
  'model/mobilenet.classes.json'
];
for (var i=1; i<=55; i++) RESOURCES.push(`model/group${i}-shard1of1`);

// Let's start by caching all resources on install
self.addEventListener('install', function(event) {
  console.log(`Service Worker installed for ${TAG}`);
  event.waitUntil(function() {
    return caches.open(TAG).then(function(cache) {
      return cache.addAll(RESOURCES);
    });
  });
});

// When devices asks for a resource, we fetch it from cache (if available)
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(res) {
      // Return cache, else fetch it from the network
      return res || fetch(event.request);
    })
  );
});
