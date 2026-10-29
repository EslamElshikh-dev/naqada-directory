(function () {
  if (!window.fbq) {
    const pixel = function () { if (pixel.callMethod) pixel.callMethod.apply(pixel,arguments); else pixel.queue.push(arguments); };
    window.fbq = pixel; window._fbq = pixel;
    pixel.push = pixel; pixel.loaded = true; pixel.version = '2.0'; pixel.queue = [];
    const script = document.createElement('script'); script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
  }
  window.fbq.disablePushState = true;
  window.fbq('set','autoConfig',false,'28666614406293709');
  window.fbq('init','28666614406293709');
})();
