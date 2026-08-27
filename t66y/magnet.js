/**
 * Surge Script: Miniflux & SmartRSS 通用磁力卡片化 (JavBus + 草榴 完美排版版)
 */

let body = $response ? $response.body : null;

if (body) {
  // 1. 处理 SmartRSS / Miniflux API (JSON 数据)
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
    // 2. 处理普通 HTML 网页
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

// === 1. JavBus 表格解析与重构 ===
function parseJavBus(html) {
  if (!html.includes('magnet:?xt=')) return html;

  // 1. 匹配并重构每一行 <tr>
  const trRegex = /<tr[\s\S]*?<\/tr>/gi;
  html = html.replace(trRegex, (trBlock) => {
    const magnetMatch = trBlock.match(/magnet:\?xt=[^'"\s<>&]+/i);
    if (!magnetMatch) return ''; // 过滤掉无磁链的纯表头行

    const magnetUrl = magnetMatch[0];

    const tdList = [...trBlock.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
    let title = '磁力下载';
    let isHD = trBlock.includes('高清') || trBlock.includes('HD');
    let isSub = trBlock.includes('字幕') || trBlock.includes('中字');

    if (tdList.length >= 1) {
      title = tdList[0][1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() || title;
    }

    let size = tdList.length >= 2 ? tdList[1][1].replace(/<[^>]+>/g, '').trim() : '';
    let date = tdList.length >= 3 ? tdList[2][1].replace(/<[^>]+>/g, '').trim() : '';
    const meta = [size, date].filter(Boolean).join(' · ');

    let badges = '';
    if (isSub) badges += ' <span style="color:#ff3b30;font-weight:bold;font-size:11px;">[中字]</span>';
    if (isHD) badges += ' <span style="color:#0a84ff;font-weight:bold;font-size:11px;">[HD]</span>';

    // 采用带外边距的独立块级卡片，强制换行不粘连
    return `
      <div style="display: block; margin: 12px 0 16px 0; clear: both;">
        <div style="font-size: 13px; font-weight: bold; color: #24292f; margin-bottom: 6px; line-height: 1.4;">
          🧲 ${title}${badges} <span style="font-size: 11px; color: #888; font-weight: normal;">(${meta})</span>
        </div>
        <blockquote style="display: block; margin: 0; padding: 8px 10px; border-left: 3.5px solid #2b5797; background: rgba(125, 125, 125, 0.06); border-radius: 0 4px 4px 0;">
          <code style="display: block; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11px; line-height: 1.4; color: #333; word-break: break-all; -webkit-user-select: all; user-select: all;">${magnetUrl}</code>
        </blockquote>
      </div>
    `;
  });

  // 2. 清理残余的空 <table> 标签及悬空的“磁力名稱 檔案大小 分享日期”表头
  html = html.replace(/<table[^>]*>[\s\S]*?<\/table>/gi, (tableBlock) => {
    // 如果表格里已经包含了我们渲染的 <blockquote> 卡片，直接把 table 壳剥掉返回内容
    return tableBlock.replace(/<\/?(table|tbody|thead|tfoot|tr|td|th)[^>]*>/gi, '');
  });
  html = html.replace(/磁力名稱[\s\S]*?分享日期/gi, '');

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
      const magnetUrl = `magnet:?xt=urn:btih:${realHash.toUpperCase()}`;

      return `
        <div style="display: block; margin: 16px 0; clear: both;">
          <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #24292f;">複製代碼</div>
          <blockquote style="display: block; margin: 0; padding: 8px 12px; border-left: 3.5px solid #2b5797; background: rgba(125, 125, 125, 0.06); border-radius: 0 4px 4px 0;">
            <code style="display: block; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12px; line-height: 1.5; color: #333; word-break: break-all; -webkit-user-select: all; user-select: all;">${magnetUrl}</code>
          </blockquote>
        </div>
      `;
    });
  }
  return html;
}
