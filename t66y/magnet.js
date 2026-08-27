/**
 * Surge Script: Miniflux 草榴/t66y 磁力免跳转提取与卡片化
 */

let body = $response ? $response.body : null;

if (body) {
  // 1. 处理 SmartRSS 的 JSON 响应
  if (body.trim().startsWith('{') || body.trim().startsWith('[')) {
    try {
      let data = JSON.parse(body);
      const processItem = (item) => {
        if (item.content && typeof item.content === 'string') {
          item.content = parseT66yMagnet(item.content);
        } else if (item.content && item.content.content) {
          item.content.content = parseT66yMagnet(item.content.content);
        }
        if (item.summary && typeof item.summary === 'string') {
          item.summary = parseT66yMagnet(item.summary);
        } else if (item.summary && item.summary.content) {
          item.summary.content = parseT66yMagnet(item.summary.content);
        }
      };

      if (data.items && Array.isArray(data.items)) data.items.forEach(processItem);
      if (data.entries && Array.isArray(data.entries)) data.entries.forEach(processItem);
      body = JSON.stringify(data);
    } catch (e) {
      console.log('[t66y Parser] JSON 解析异常: ' + e);
    }
  } else {
    // 2. 处理 Miniflux 网页端的 HTML 响应
    body = parseT66yMagnet(body);
  }

  $done({ body: body });
} else {
  $done({});
}

// 核心转换函数
function parseT66yMagnet(html) {
  if (!html) return html;

  // 正则匹配 rmdown 链接（包括 <a> 标签包裹的或纯文本 URL）
  // 兼容形如: https://www.rmdown.com/link.php?hash=262521f2f5f6...
  const rmdownRegex = /(?:<a[^>]*href=["'])?(https?:\/\/(?:www\.)?rmdown\.com\/link\.php\?hash=([a-zA-Z0-9]+))(?:["'][^>]*>[\s\S]*?<\/a>)?/gi;

  if (rmdownRegex.test(html)) {
    html = html.replace(rmdownRegex, (match, fullUrl, rawHash) => {
      // rmdown hash 长度通常为 43 或 42 位，真实 BT-HASH 为最后 40 位 SHA1
      let realHash = rawHash;
      if (rawHash && rawHash.length > 40) {
        realHash = rawHash.slice(-40);
      }
      const magnetUrl = `magnet:?xt=urn:btih:${realHash}`;

      // 渲染为深浅色自适应、点按即全选的磁力卡片
      return `
        <div style="margin: 16px 0; background: rgba(125, 125, 125, 0.08); border: 1px solid rgba(125, 125, 125, 0.2); border-radius: 8px; padding: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="font-size: 14px; font-weight: bold; color: #0969da;">⚡ 磁力链接已直接提取</div>
            <div style="font-size: 11px; color: #666; font-family: monospace;">HASH: ${realHash.substring(0, 8)}...</div>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <input type="text" readonly value="${magnetUrl}" onfocus="this.select();" onclick="this.select();" 
              style="flex: 1; height: 32px; box-sizing: border-box; background: rgba(0,0,0,0.06); border: 1px solid rgba(125,125,125,0.3); border-radius: 6px; padding: 0 8px; font-family: ui-monospace, Menlo, monospace; font-size: 12px; color: #1a7f37; outline: none; -webkit-user-select: all; user-select: all;" />
            <button onclick="
              const btn = this;
              if (navigator.clipboard) {
                navigator.clipboard.writeText('${magnetUrl}').then(() => {
                  btn.innerText = '已复制 ✓';
                  btn.style.background = '#2da44e';
                  setTimeout(() => { btn.innerText = '复制'; btn.style.background = '#0969da'; }, 1500);
                });
              } else {
                prompt('请长按复制:', '${magnetUrl}');
              }
            " style="height: 32px; background: #0969da; color: #fff; border: none; border-radius: 6px; padding: 0 14px; font-size: 12px; font-weight: 500; cursor: pointer; white-space: nowrap; -webkit-appearance: none;">
              复制
            </button>
          </div>
        </div>
      `;
    });
  }

  return html;
}
