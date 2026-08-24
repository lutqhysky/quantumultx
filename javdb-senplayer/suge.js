/**
 * Surge Script: JavDB 视频流拦截 + 番号/标题深度解析 + SenPlayer 联动
 */

const req = typeof $request !== 'undefined' ? $request : null;
const resp = typeof $response !== 'undefined' ? $response : null;

// ==========================================
// 阶段 1: 拦截网页 HTML 响应，提前提取【番号与标题】
// ==========================================
if (resp && resp.body && req && req.url.includes('/v/')) {
  try {
    const html = resp.body;
    // 匹配 <div class="player-title">JUKD-946 巨乳人妻...</div>
    const titleMatch = html.match(/class=["']player-title["'][^>]*>([\s\S]*?)<\/div>/i);
    if (titleMatch && titleMatch[1]) {
      const fullTitle = titleMatch[1].trim();
      
      // 提取番号（通常是开头的英文字母+数字组合，如 JUKD-946）
      const codeMatch = fullTitle.match(/^([A-Za-z0-9_\-]+)\s*/);
      const code = codeMatch ? codeMatch[1] : '';
      
      // 存入临时缓存供后续 m3u8 匹配
      const metaData = {
        code: code,
        title: fullTitle,
        updatedAt: Date.now()
      };
      $persistentStore.write(JSON.stringify(metaData), 'javdb_last_meta');
    }
  } catch (e) {
    console.log('[JavDB HTML] 解析标题失败: ' + e);
  }
  $done({});
}

// ==========================================
// 阶段 2: 拦截 m3u8 视频流请求
// ==========================================
if (req && req.url && req.url.includes('/movies/ttm3u8/')) {
  const reqUrl = req.url;

  // 2.1 拦截 SenPlayer 请求并自动补齐 Referer/Cookie 防盗链
  if (!req.headers['Referer'] && !req.headers['referer']) {
    const modifiedHeaders = Object.assign({}, req.headers);
    modifiedHeaders['Referer'] = 'https://javdb.com/';
    modifiedHeaders['Origin'] = 'https://javdb.com';
    
    const savedCookie = $persistentStore.read('javdb_cookie');
    if (savedCookie) modifiedHeaders['Cookie'] = savedCookie;

    $done({ headers: modifiedHeaders });
  } else {
    // 2.2 浏览器端发起的播放请求：保存 Cookie 与记录历史
    if (req.headers) {
      const cookie = req.headers['Cookie'] || req.headers['cookie'];
      if (cookie) $persistentStore.write(cookie, 'javdb_cookie');
    }

    // 读取 BoxJS 设置
    const targetPlayer = $persistentStore.read('javdb_target_player') || 'senplayer';
    const notifyVal = $persistentStore.read('javdb_notify_enabled');
    const notifyEnabled = (notifyVal === undefined || notifyVal === null) ? true : (notifyVal === 'true' || notifyVal === true);

    // 读取刚才从 HTML 提取到的 番号与片名
    let videoCode = '未知番号';
    let videoTitle = 'JavDB 视频预览';
    try {
      const lastMeta = JSON.parse($persistentStore.read('javdb_last_meta') || '{}');
      if (lastMeta.title && (Date.now() - lastMeta.updatedAt < 60000)) { // 1分钟内有效
        videoCode = lastMeta.code || videoCode;
        videoTitle = lastMeta.title || videoTitle;
      }
    } catch (e) {}

    // 解析分辨率与过期时间
    const qualityMatch = reqUrl.match(/\/([^\.\?\/]+)\.m3u8/);
    const quality = qualityMatch ? qualityMatch[1].toUpperCase() : '480P';

    const tParamMatch = reqUrl.match(/[\?&]t=(\d+)/);
    let expireTimeStr = '未知';
    if (tParamMatch && tParamMatch[1]) {
      const expireDate = new Date(parseInt(tParamMatch[1]) * 1000);
      expireTimeStr = expireDate.toLocaleString('zh-CN', { hour12: false });
    }

    // 构造 SenPlayer 播放协议（将真实 番号+片名 作为播放器内的显示名称）
    const defaultUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
    const displayName = videoCode !== '未知番号' ? `[${videoCode}] ${videoTitle}` : `JavDB Preview ${quality}`;
    const senPlayerUrl = `senplayer://x-callback-url/play?url=${encodeURIComponent(reqUrl)}&name=${encodeURIComponent(displayName)}&User-Agent=${encodeURIComponent(defaultUA)}&saveURL`;

    // 写入 BoxJS 历史记录
    try {
      const rawHistory = $persistentStore.read('javdb_history_list');
      let history = rawHistory ? JSON.parse(rawHistory) : [];
      if (!Array.isArray(history)) history = [];

      // 按番号或 URL 去重
      history = history.filter(item => (videoCode !== '未知番号' ? item.code !== videoCode : item.url !== reqUrl));

      history.unshift({
        code: videoCode,
        title: videoTitle,
        quality: quality,
        time: new Date().toLocaleString('zh-CN', { hour12: false }),
        expireAt: expireTimeStr,
        player: targetPlayer,
        url: reqUrl,
        scheme: senPlayerUrl
      });

      if (history.length > 20) history = history.slice(0, 20);
      $persistentStore.write(JSON.stringify(history, null, 2), 'javdb_history_list');
    } catch (e) {
      console.log('[JavDB Capture] 历史记录异常: ' + e);
    }

    // 发送弹窗通知（直接展示 番号 和 片名）
    if (notifyEnabled) {
      $notification.post(
        `🎬 ${videoCode} [${quality}]`,
        `${videoTitle}`,
        `点击跳转 SenPlayer 播放 (有效至: ${expireTimeStr})`,
        { 'open-url': senPlayerUrl, 'url': senPlayerUrl }
      );
    }

    $done({});
  }
} else {
  $done({});
}
