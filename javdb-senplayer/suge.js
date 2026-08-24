/**
 * Surge Script: JavDB 视频流拦截 + BoxJS 联动 (修复参数异常版)
 */

const requestUrl = $request ? $request.url : null;

// 仅当捕获到视频流链接时执行
if (requestUrl && (requestUrl.includes('.m3u8') || requestUrl.includes('.mp4'))) {
  // 1. 读取 BoxJS / Surge 持久化存储的配置项
  const targetPlayer = $persistentStore.read('javdb_target_player') || 'senplayer';
  const notifyVal = $persistentStore.read('javdb_notify_enabled');
  const notifyEnabled = (notifyVal === undefined || notifyVal === null) ? true : (notifyVal === 'true' || notifyVal === true);

  // 2. 根据选定的播放器构建对应 URL Scheme
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
    case 'none':
    default:
      openSchemeUrl = '';
      break;
  }

  // 3. 记录捕获历史到 BoxJS 文本框（保留最新 20 条）
  try {
    const rawHistory = $persistentStore.read('javdb_history_list');
    let history = rawHistory ? JSON.parse(rawHistory) : [];
    if (!Array.isArray(history)) history = [];

    // 去重并排在首位
    history = history.filter(item => item.url !== requestUrl);
    history.unshift({
      time: new Date().toLocaleString('zh-CN', { hour12: false }),
      player: targetPlayer,
      url: requestUrl
    });

    if (history.length > 20) history = history.slice(0, 20);
    $persistentStore.write(JSON.stringify(history, null, 2), 'javdb_history_list');
  } catch (e) {
    console.log('[JavDB Capture] 历史记录写入异常: ' + e);
  }

  // 4. 发送通知（严格遵循 Surge 标准字典参数格式）
  if (notifyEnabled) {
    const playerTitle = targetPlayer === 'none' ? '仅记录直链' : `跳转至 ${targetPlayer.toUpperCase()}`;
    const jumpUrl = openSchemeUrl || requestUrl;

    $notification.post(
      '🎬 JavDB 视频流捕获成功',
      `目标模式: ${playerTitle}`,
      '点击此通知直接开始播放',
      { 'url': jumpUrl }
    );
  }
}

// 正常放行请求，确保页面不报错
$done({});
