/**
 * Surge Script: JavDB 视频流拦截 + SenPlayer 官方 Scheme 完美适配
 * 支持: 自动伪装 User-Agent、自动保存到播放列表、BoxJS 路由与历史记录
 */

const requestUrl = typeof $request !== 'undefined' && $request ? $request.url : null;

if (requestUrl && (requestUrl.includes('.m3u8') || requestUrl.includes('.mp4'))) {
  // 1. 读取 BoxJS 配置
  const targetPlayer = $persistentStore.read('javdb_target_player') || 'senplayer';
  const notifyVal = $persistentStore.read('javdb_notify_enabled');
  const notifyEnabled = (notifyVal === undefined || notifyVal === null) ? true : (notifyVal === 'true' || notifyVal === true);

  // 2. 构造符合 SenPlayer 官方规范的 URL Scheme
  // 参数说明: url (必须编码), name (播放列表名称), User-Agent (严格区分大小写), saveURL (自动归档)
  const defaultUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
  
  let openSchemeUrl = '';
  switch (targetPlayer) {
    case 'senplayer':
      openSchemeUrl = `senplayer://x-callback-url/play?url=${encodeURIComponent(requestUrl)}&name=${encodeURIComponent('JavDB Preview')}&User-Agent=${encodeURIComponent(defaultUA)}&saveURL`;
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
      openSchemeUrl = '';
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
  } catch (e) {}

  // 4. 发送通知 (Surge iOS 最稳定的 open-url 格式)
  if (notifyEnabled) {
    const targetAction = openSchemeUrl || requestUrl;
    $notification.post(
      '🎬 JavDB 视频流已捕获',
      '点击通知直接跳转 SenPlayer 播放并保存',
      requestUrl,
      { 'open-url': targetAction, 'url': targetAction }
    );
  }
}

$done({});
