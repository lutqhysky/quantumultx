// X (Twitter) 去广告 · Timeline 推广过滤
// 作用：过滤时间线 GraphQL 响应中的推广推文（promoted tweets）
// 依据：2026-11-20 抓包确认
//   - 时间线数据走 api.twitter.com / api.x.com 的 GraphQL（HomeTimeline 等）
//   - 推广推文在 itemContent 层带 promotedMetadata 字段（非推广推文没有）
//   - 推广视频走 video.twimg.com / video-s.twimg.com 的 /amplify_video/ 路径
//     （本次抓包 8 秒内全部 43 条视频请求都是 amplify_video，
//      没有一条正常用户视频），由模块的 URL Rewrite 直接 reject。
// 匹配：仅处理已知的 timeline 类操作，其他 GraphQL 响应原样放行。
// 安全：解析失败或结构异常时一律原样返回，不破坏时间线；
//       cursor（翻页标记）一律保留。

const PROMOTED_OPS = [
  'HomeTimeline', 'HomeLatestTimeline',
  'SearchTimeline',
  'UserTweets', 'UserMedia',
  'TweetDetail',
  'ListTimeline',
  'Bookmarks'
];

function isTimelineOp(url) {
  // /graphql/<hash>/<OperationName> ，hash 随 App 版本变，只认操作名
  const m = url.match(/\/graphql\/[A-Za-z0-9_-]+\/([A-Za-z0-9_]+)/);
  return m && PROMOTED_OPS.indexOf(m[1]) !== -1;
}

function isPromotedEntry(entry) {
  if (!entry || typeof entry !== 'object') return false;
  // entryId 如 promoted-tweet-xxx
  if (typeof entry.entryId === 'string' && entry.entryId.indexOf('promoted') === 0) return true;
  const content = entry.content;
  if (!content || typeof content !== 'object') return false;
  const item = content.itemContent;
  if (!item || typeof item !== 'object') return false;
  // 推广推文的唯一可靠标记：itemContent.promotedMetadata（仅广告有）
  if (item.promotedMetadata) return true;
  return false;
}

function filterEntries(entries) {
  if (!Array.isArray(entries)) return entries;
  let removed = 0;
  const kept = entries.filter(function (entry) {
    if (isPromotedEntry(entry)) { removed++; return false; }
    return true;
  });
  return { entries: kept, removed: removed };
}

function walk(node, stats) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) walk(node[i], stats);
    return;
  }
  // TimelineAddEntries：主时间线条目
  if (node.type === 'TimelineAddEntries' && Array.isArray(node.entries)) {
    const r = filterEntries(node.entries);
    node.entries = r.entries;
    stats.removed += r.removed;
  }
  // TimelineAddToModule：模块内条目（如有推广也过滤）
  if (node.type === 'TimelineAddToModule' && Array.isArray(node.moduleItems)) {
    const r = filterEntries(node.moduleItems);
    node.moduleItems = r.entries;
    stats.removed += r.removed;
  }
  for (const key in node) {
    if (Object.prototype.hasOwnProperty.call(node, key)) walk(node[key], stats);
  }
}

(function main() {
  try {
    const url = $request.url || '';
    if (!isTimelineOp(url)) { $done({}); return; }
    const body = $response.body;
    if (!body) { $done({}); return; }
    const data = JSON.parse(body);
    const stats = { removed: 0 };
    walk(data, stats);
    if (stats.removed === 0) { $done({}); return; }
    console.log('[X去广告] 已过滤 ' + stats.removed + ' 条推广：' + url);
    $done({ body: JSON.stringify(data) });
  } catch (e) {
    // 任何异常都原样放行，不破坏时间线
    console.log('[X去广告] 处理异常，原样返回：' + (e && e.message));
    $done({});
  }
})();
