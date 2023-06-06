const url = /^https?:\/\/(bllmfy\.hxcwqh|bbll\.madou.*|cfxian\.xickud|ioeurn\.yrvguhx|bblmfy\.cbsbwr)\.com\/api\/(app|h5app)\/media\/m3u8\/(zh|av)\/.*\.m3u8$/;

const url = $request.url;

$notification.post('M3U8 Link Detected', 'Tap to Play', url, {
  "open-url": 'safari://open?url=' + encodeURIComponent(url.replace(/.*?:\/\//g, "")) + '&private=true'
});
