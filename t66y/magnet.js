/**
 * Surge Script: Miniflux & SmartRSS 通用磁力卡片化 (JavBus + 草榴/t66y 合并版)
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
    // 2. 处理 Miniflux / JavBus 网页端 (HTML 数据)
    body = handleAllMagnets(body);
  }

  $done({ body: body });
} else {
  $done({});
}

// 通用内容处理链
function handleAllMagnets(html) {
  if (!html) return html;
  
  // 1. 处理 JavBus 磁力表格
  html = parseJavBus(html);
  
  // 2. 处理草榴 / rmdown 链接
  html = parseT66y(html);

  return html;
}

// === 子模块 1: JavBus 表格解析 ===
function parseJavBus(html) {
  if (!html.includes('magnet:?xt=')) return html;

  const trRegex = /<tr[\s\S]*?<\/tr>/gi;
  if (trRegex.test(html)) {
    html = html.replace(trRegex, (trBlock) => {
      const magnetMatch = trBlock.match(/magnet:\?xt=[^'"\s<>&]+/i);
      if (!magnetMatch) return trBlock;
      const magnetUrl = magnetMatch[0];

      // 提取标题
      const nameMatch = trBlock.match(/<td[^>]*width=["']?70%["']?[^>]*>([\s\S]*?)<\/td>/i);
      let title = '磁力链接';
      let isHD = trBlock.includes('高清') || trBlock.includes('HD');
      let isSub = trBlock.includes('字幕') || trBlock.includes('中字');

      if (nameMatch && nameMatch[1]) {
        title = nameMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() || title;
      }

      // 提取大小与日期
      const tdList = [...trBlock.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
      let size = tdList.length >= 2 ? tdList[1][1].replace(/<[^>]+>/g, '').trim() : '';
      let date = tdList.length >= 3 ? tdList[2][1].replace(/<[^>]+>/g, '').trim() : '';
      const meta = [size, date].filter(Boolean).join(' · ');

      // 徽章样式
      let badges = '';
      if (isSub) badges += '<span style="background: rgba(255, 45, 85, 0.2); color: #ff3b30; font-size: 10px; font-weight: bold; padding: 1px 4px; border-radius: 4px; margin-left: 5px;">中字</span>';
      if (isHD) badges += '<span style="background: rgba(0, 122, 255, 0.2); color: #0a84ff; font-size: 10px; font-weight: bold; padding: 1px 4px; border-radius: 4px; margin-left: 5px;">HD</span>';

      return `
        <tr style="border-top: 1px solid rgba(255, 255, 255, 0.08);">
          <td colspan="3" style="padding: 10px 4px;">
            <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 10px 12px; display: flex; flex-direction: column; gap: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 13px; font-weight: 600; color: #58a6ff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 70%;">
                  🧲 ${title} ${badges}
                </div>
                <div style="font-size: 11px; color: #888;">${meta}</div>
              </div>
              <div style="display: flex; justify-content: flex-end; align-items: center;">
                <button onclick="
                  const btn = this;
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText('${magnetUrl}').then(() => {
                      btn.innerText = '已复制 ✓';
                      btn.style.background = '#2ea043';
                      setTimeout(() => { btn.innerText = '复制磁链'; btn.style.background = '#1f6feb'; }, 1500);
                    });
                  } else {
                    prompt('请长按复制磁力链接:', '${magnetUrl}');
                  }
                " style="background: #1f6feb; color: #ffffff; border: none; border-radius: 5px; padding: 4px 12px; font-size: 11px; font-weight: 500; cursor: pointer; -webkit-appearance: none;">
                  复制磁链
                </button>
              </div>
            </div>
          </td>
        </tr>
      `;
    });
  }
  return html;
}

// === 子模块 2: 草榴 / rmdown 解析 ===
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
