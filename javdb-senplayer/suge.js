/**
 * Surge Script: JavDB 视频流拦截 + 智能元数据解析 + 本地代理防盗链
 */

const request = typeof $request !== 'undefined' ? $request : null;

if (request && request.url) {
  const reqUrl = request.url;

  // 1. 如果是网页请求 m3u8，记录凭证并提取元数据
  if (reqUrl.includes('/movies/ttm3u8/')) {
    // 1.1 缓存防盗链凭据
    if (request.headers) {
      const cookie = request.headers['Cookie'] || request.headers['cookie'];
      if (cookie) {
        $persistentStore.write(cookie, 'javdb_cookie');
      }
    }

    // 1.2 读取 BoxJS 设置
    const targetPlayer = $persistentStore.read('javdb_target_player') || 'senplayer';
    const notifyVal = $persistentStore.read('javdb_notify_enabled');
    const notifyEnabled = (notifyVal === undefined || notifyVal === null) ? true : (notifyVal === 'true' || notifyVal === true);

    // 1.3 智能解析 URL 中的影片元数据
    // 匹配: /movies/ttm3u8/movie/{movieId}/{part}/{quality}.m3u8
    const match = reqUrl.match(/\/movies\/ttm3u8\/movie\/([^\/]+)\/([^\/]+)\/([^\.\?]+)/);
    const movieId = match ? match[1] : 'Unknown';
    const quality = match ? match[3].toUpperCase() : '480P';
    
    // 解析防盗链过期时间 (t 参数)
    const tParamMatch = reqUrl.match(/[\?&]t=(\d+)/);
    let expireTimeStr = '未知';
    if (tParamMatch && tParamMatch[1]) {
      const expireDate = new Date(parseInt(tParamMatch[1]) * 1000);
      expireTimeStr = expireDate.toLocaleString('zh-CN', { hour12: false });
    }

    // 1.4 构造 SenPlayer 官方 URL Scheme
    const defaultUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
    const displayName = `JavDB_${movieId}_${quality}`;
    const senPlayerUrl = `senplayer://x-callback-url/play?url=${encodeURIComponent(reqUrl)}&name=${encodeURIComponent(displayName)}&User-Agent=${encodeURIComponent(defaultUA)}&saveURL`;

    // 1.5 写入结构化历史记录到 BoxJS（按影片 ID 智能去重置顶）
    try {
      const rawHistory = $persistentStore.read('javdb_history_list');
      let history = rawHistory ? JSON.parse(rawHistory) : [];
      if (!Array.isArray(history)) history = [];

      // 移除同影片旧记录
      history = history.filter(item => item.movieId !== movieId);

      // 插入最新富结构数据
      history.unshift({
        movieId: movieId,
        quality: quality,
        time: new Date().toLocaleString('zh-CN', { hour12: false }),
        expireAt: expireTimeStr,
        player: targetPlayer,
        url: reqUrl,
        scheme: senPlayerUrl
      });

      // 限制保留最多 20 条
      if (history.length > 20) history = history.slice(0, 20);
      $persistentStore.write(JSON.stringify(history, null, 2), 'javdb_history_list');
    } catch (e) {
      console.log('[JavDB Capture] 写入历史异常: ' + e);
    }

    // 1.6 发送带清晰识别信息的通知
    if (notifyEnabled) {
      $notification.post(
        `🎬 JavDB 视频已捕获 [${quality}]`,
        `影片编号: ${movieId} (点击播放)`,
        `有效至: ${expireTimeStr}`,
        { 'open-url': senPlayerUrl, 'url': senPlayerUrl }
      );
    }
  }

  // 2. 拦截 SenPlayer 请求并自动注入 Referer/Cookie 防盗链
  if (reqUrl.includes('/movies/ttm3u8/') && (!request.headers['Referer'] && !request.headers['referer'])) {
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

// 正常放行
$done({});
