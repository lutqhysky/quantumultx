/**
 * Surge Script: JavDB 视频流拦截 + BoxJS 联动 (官方标准 API 版)
 */

const requestUrl = typeof $request !== 'undefined' && $request ? $request.url : null;

// 仅当捕获到视频流链接时执行
if (requestUrl && (requestUrl.includes('.m3u8') || requestUrl.includes('.mp4'))) {
  // 1. 读取 BoxJS / Surge 持久化存储的配置项
  const targetPlayer = $persistentStore.read('javdb_target_player') || 'senplayer';
  const notifyVal = $persistentStore.read('javdb_notify_enabled');
  const notifyEnabled = (notifyVal === undefined || notifyVal === null) ? true : (notifyVal === 'true' || notifyVal === true);

  // 2. 构建目标播放器 Scheme
  let openSchemeUrl = '';
  switch (targetPlayer) {
    case 'senplayer':
      openSchemeUrl = `senplayer://x-callback-url/play?url=${encodeURIComponent(requestUrl)}`;
      break;
    case 'iina':
      openSchemeUrl = `iina://weblink?url=${encodeURIComponent(requestUrl)}`;
      break;
    case 'infuse':
      openSchemeUrl = `infuse://play?url=${encodeURIComponent(requestUrl)}`;
      break;
    case 'vlc':
      openSchemeUrl = `vlc://${encodeURIComponent(requestUrl)}`;
      break;
    case 'nplayer':
      openSchemeUrl = `nplayer-${encodeURIComponent(requestUrl)}`;
      break;
    default:
      openSchemeUrl = requestUrl;
      break;
  }

  // 3. 记录捕获历史到 BoxJS
  try {
    const rawHistory = $persistentStore.read('javdb_history_list');
    let history = rawHistory ? JSON.parse(rawHistory) : [];
    if (!Array.isArray(history)) history = [];

    history = history.filter(item => item.url !== requestUrl);
    history.unshift({
      time: new Date().toLocaleString('zh-CN', { hour12: false }),
      player: targetPlayer,
      url: requestUrl
    });

    if (history.length > 20) history = history.slice(0, 20);
    $persistentStore.write(JSON.stringify(history, null, 2), 'javdb_history_list');
  } catch (e) {
    // 忽略异常
  }

  // 4. 写入剪贴板（如果环境支持）
  if (typeof $copy !== 'undefined') {
    $copy(openSchemeUrl || requestUrl);
  }

  // 5. 发送通知 (严格保持 3 个参数，杜绝 API 参数报错)
  if (notifyEnabled) {
    const playerTitle = targetPlayer === 'none' ? '已记录' : targetPlayer.toUpperCase();
    $notification.post(
      '🎬 JavDB 视频已捕获',
      `目标播放器: ${playerTitle} (已复制)`,
      `${requestUrl}`
    );
  }
}

// 正常放行请求
$done({});
