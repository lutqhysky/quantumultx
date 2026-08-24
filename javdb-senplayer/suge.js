/**
 * Surge Script: JavDB 视频流拦截 + 本地代理转发 (完美破除防盗链 403)
 */

const request = $request;

if (request && request.url) {
  // 1. 如果是网页请求 m3u8，记录最新的防盗链凭证
  if (request.url.includes('/movies/ttm3u8/')) {
    const rawUrl = request.url;
    
    // 缓存请求头凭证
    if (request.headers) {
      if (request.headers['Cookie'] || request.headers['cookie']) {
        $persistentStore.write(request.headers['Cookie'] || request.headers['cookie'], 'javdb_cookie');
      }
    }

    // 2. 构造由 Surge 本地代理中转的播放链接
    // 这样 SenPlayer 请求这个地址时，会再次触发 Surge 自动补全 Referer/Cookie
    const localPlayUrl = rawUrl; // 带签名的原始链接
    
    const defaultUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
    const senPlayerUrl = `senplayer://x-callback-url/play?url=${encodeURIComponent(localPlayUrl)}&name=${encodeURIComponent('JavDB Preview')}&User-Agent=${encodeURIComponent(defaultUA)}&saveURL`;

    // 3. 发送通知
    $notification.post(
      '🎬 JavDB 视频已捕获 (已破防盗链)',
      '点击跳转 SenPlayer 播放',
      rawUrl,
      { 'open-url': senPlayerUrl, 'url': senPlayerUrl }
    );
  }

  // 2. 如果检测到是 SenPlayer 发起的视频流请求（缺少 Referer 时自动补全）
  if (request.url.includes('/movies/ttm3u8/') && (!request.headers['Referer'] && !request.headers['referer'])) {
    const modifiedHeaders = Object.assign({}, request.headers);
    modifiedHeaders['Referer'] = 'https://javdb.com/';
    modifiedHeaders['Origin'] = 'https://javdb.com';
    
    const savedCookie = $persistentStore.read('javdb_cookie');
    if (savedCookie) {
      modifiedHeaders['Cookie'] = savedCookie;
    }

    $done({ headers: modifiedHeaders });
    return;
  }
}

$done({});
