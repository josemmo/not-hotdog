if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('worker.js', {
    scope: '.' // IMPORTANT! Scope must be set on non-root apps for this to work
  }).then(function(res) {
    console.log('Service Worker successfully installed!');
  }).catch(function(error) {
    console.error('Failed to register Service Worker', error);
  });
}
