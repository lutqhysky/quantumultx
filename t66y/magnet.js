/**
 * Surge Script: Miniflux & JavBus & 草榴 磁力通用解析 (SmartRSS 防过滤版)
 */

let body = $response ? $response.body : null;

if (body) {
  if (body.trim().startsWith('{') || body.trim().startsWith('[')) {
    try {
      let data = JSON.parse(body);
      const processItem = (item) => {
        if (item.content && typeof item.content === 'string') {
          item.content = handleAllMagnets(item.content);
        } else if (item.content && item.content.content) {
          item.content.content = handleAllMagnets(item.content.content);
        }
        if (item.summary && typeof item.summary === 'string') {
          item.summary = handleAllMagnets(item.summary);
        } else if (item.summary && item.summary.content) {
          item.summary.content = handleAllMagnets(item.summary.content);
        }
      };

      if (data.items && Array.isArray(data.items)) data.items.forEach(processItem);
      if (data.entries && Array.isArray(data.entries)) data.entries.forEach(processItem);
      body = JSON.stringify(data);
    } catch (e) {
      console.log('[Miniflux Parser] JSON 解析异常: ' + e);
    }
  } else {
    body = handleAllMagnets(body);
  }

  $done({ body: body });
} else {
  $done({});
}

function handleAllMagnets(html) {
  if (!html) return html;
  html = parseJavBus(html);
  html = parseT66y(html);
  return html;
}

// === 1. JavBus 表格解析 ===
function parseJavBus(html) {
  if (!html.includes('magnet:?xt=')) return html;

  const trRegex = /<tr[\s\S]*?<\/tr>/gi;
  if (trRegex.test(html)) {
    html = html.replace(trRegex, (trBlock) => {
      const magnetMatch = trBlock.match(/magnet:\?xt=[^'"\s<>&]+/i);
      if (!magnetMatch) return trBlock;
      const magnetUrl = magnetMatch[0];

      const tdList = [...trBlock.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
      let title = '磁力链接';
      let isHD = trBlock.includes('高清') || trBlock.includes('HD');
      let isSub = trBlock.includes('字幕') || trBlock.includes('中字');

      if (tdList.length >= 1) {
        title = tdList[0][1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() || title;
      }

      let size = tdList.length >= 2 ? tdList[1][1].replace(/<[^>]+>/g, '').trim() : '';
      let date = tdList.length >= 3 ? tdList[2][1].replace(/<[^>]+>/g, '').trim() : '';
      const meta = [size, date].filter(Boolean).join(' · ');

      let badges = '';
      if (isSub) badges += ' <span style="color:#ff3b30;font-weight:bold;">[中字]</span>';
      if (isHD) badges += ' <span style="color:#0a84ff;font-weight:bold;">[HD]</span>';

      return `
        <div style="margin: 8px 0; padding: 8px 10px; background: rgba(125, 125, 125, 0.08); border-radius: 6px;">
          <div style="font-size: 13px; font-weight: bold; color: #0969da; margin-bottom: 4px;">
            🧲 ${title}${badges} <span style="font-size: 11px; color: #777; font-weight: normal;">(${meta})</span>
          </div>
          <code style="display: block; word-break: break-all; font-family: monospace; font-size: 11px; color: #1a7f37; background: rgba(0,0,0,0.06); padding: 6px 8px; border-radius: 4px; -webkit-user-select: all; user-select: all;">${magnetUrl}</code>
        </div>
      `;
    });
  }
  return html;
}

// === 2. 草榴 / rmdown 解析 ===
function parseT66y(html) {
  const rmdownRegex = /(?:<a[^>]*href=["'])?(https?:\/\/(?:www\.)?rmdown\.com\/link\.php\?hash=([a-zA-Z0-9]+))(?:["'][^>]*>[\s\S]*?<\/a>)?/gi;

  if (rmdownRegex.test(html)) {
    html = html.replace(rmdownRegex, (match, fullUrl, rawHash) => {
      let realHash = rawHash;
      if (rawHash && rawHash.length > 40) {
        realHash = rawHash.slice(-40);
      }
      const magnetUrl = `magnet:?xt=urn:btih:${realHash}`;

      return `
        <div style="margin: 12px 0; padding: 10px; background: rgba(125, 125, 125, 0.08); border-radius: 6px;">
          <div style="font-size: 13px; font-weight: bold; color: #0969da; margin-bottom: 6px;">
            ⚡ 资源磁力链接 (长按/双击复制)
          </div>
          <code style="display: block; word-break: break-all; font-family: monospace; font-size: 11px; color: #1a7f37; background: rgba(0,0,0,0.06); padding: 6px 8px; border-radius: 4px; -webkit-user-select: all; user-select: all;">${magnetUrl}</code>
        </div>
      `;
    });
  }
  return html;
}
