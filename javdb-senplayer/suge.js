/**
 * Surge Script: JavDB 视频流拦截 + BoxJS 多播放器联动
 */

const requestUrl = $request.url;

if (requestUrl && (requestUrl.includes('.m3u8') || requestUrl.includes('.mp4'))) {
  // 1. 读取 BoxJS 配置项
  const targetPlayer = $persistentStore.read('javdb_target_player') || 'senplayer';
  const notifyEnabled = ($persistentStore.read('javdb_notify_enabled') ?? 'true') === 'true';

  // 2. 根据目标播放器构建对应的 URL Scheme
  let schemeUrl = '';
  switch (targetPlayer) {
    case 'senplayer':
      schemeUrl = `senplayer://x-callback-url/play?url=${encodeURIComponent(requestUrl)}`;
      break;
    case 'iina':
      schemeUrl = `iina://weblink?url=${encodeURIComponent(requestUrl)}`;
      break;
    case 'infuse':
      schemeUrl = `infuse://play?url=${encodeURIComponent(requestUrl)}`;
      break;
    case 'vlc':
      schemeUrl = `vlc://${encodeURIComponent(requestUrl)}`;
      break;
    case 'nplayer':
      schemeUrl = `nplayer-${encodeURIComponent(requestUrl)}`;
      break;
    default:
      schemeUrl = '';
  }

  // 3. 记录捕获历史（保留最新 20 条）
  try {
    let history = JSON.parse($persistentStore.read('javdb_history_list') || '[]');
    history.unshift({
      time: new Date().toLocaleString(),
      url: requestUrl
    });
    if (history.length > 20) history = history.slice(0, 20);
    $persistentStore.write(JSON.stringify(history, null, 2), 'javdb_history_list');
  } catch (e) {
    // 忽略解析错误
  }

  // 4. 发送通知
  if (notifyEnabled) {
    $notification.post(
      '🎬 JavDB 视频流捕获成功',
      `目标播放器: ${targetPlayer.toUpperCase()}`,
      `直链: ${requestUrl.substring(0, 60)}...`,
      schemeUrl || requestUrl
    );
  }
}

// 放行原请求
$done({});
