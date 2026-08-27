/**
 * Surge Script: Miniflux & JavBus & 草榴 磁力复制卡片 (无跳转纯复制版)
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
      if (isSub) badges += '<span style="background: rgba(255, 45, 85, 0.2); color: #ff3b30; font-size: 10px; font-weight: bold; padding: 1px 4px; border-radius: 4px; margin-left: 5px;">中字</span>';
      if (isHD) badges += '<span style="background: rgba(0, 122, 255, 0.2); color: #0a84ff; font-size: 10px; font-weight: bold; padding: 1px 4px; border-radius: 4px; margin-left: 5px;">HD</span>';

      return `
        <tr style="border-top: 1px solid rgba(125, 125, 125, 0.15);">
          <td colspan="3" style="padding: 6px 2px;">
            <div style="background: rgba(125, 125, 125, 0.08); border-radius: 8px; padding: 8px 10px; display: flex; flex-direction: column; gap: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 13px; font-weight: 600; color: #0969da; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 70%;">
                  🧲 ${title} ${badges}
                </div>
                <div style="font-size: 11px; color: #777;">${meta}</div>
              </div>
              <div style="display: flex; gap: 6px; align-items: center;">
                <input type="text" readonly value="${magnetUrl}" onfocus="this.select();" onclick="this.select();" 
                  style="flex: 1; height: 28px; box-sizing: border-box; background: rgba(0,0,0,0.05); border: 1px solid rgba(125,125,125,0.25); border-radius: 4px; padding: 0 6px; font-family: monospace; font-size: 10px; color: #1a7f37; outline: none; -webkit-user-select: all; user-select: all;" />
                <button onclick="
                  const btn = this;
                  const input = btn.previousElementSibling;
                  input.select();
                  input.setSelectionRange(0, 99999);
                  let ok = false;
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText('${magnetUrl}').then(() => { ok = true; });
                  }
                  try { document.execCommand('copy'); ok = true; } catch(e){}
                  btn.innerText = '已复制 ✓';
                  btn.style.background = '#2da44e';
                  setTimeout(() => { btn.innerText = '复制'; btn.style.background = '#0969da'; }, 1500);
                " style="height: 28px; background: #0969da; color: #fff; border: none; border-radius: 4px; padding: 0 12px; font-size: 11px; font-weight: 500; cursor: pointer; white-space: nowrap; -webkit-appearance: none; transition: background 0.2s;">
                  复制
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
        <div style="margin: 12px 0; background: rgba(125, 125, 125, 0.08); border-radius: 8px; padding: 10px 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <div style="font-size: 13px; font-weight: bold; color: #0969da;">⚡ 磁力链接已直接提取</div>
            <div style="font-size: 11px; color: #777; font-family: monospace;">HASH: ${realHash.substring(0, 8)}...</div>
          </div>
          <div style="display: flex; gap: 6px; align-items: center;">
            <input type="text" readonly value="${magnetUrl}" onfocus="this.select();" onclick="this.select();" 
              style="flex: 1; height: 28px; box-sizing: border-box; background: rgba(0,0,0,0.05); border: 1px solid rgba(125,125,125,0.25); border-radius: 4px; padding: 0 6px; font-family: monospace; font-size: 10px; color: #1a7f37; outline: none; -webkit-user-select: all; user-select: all;" />
            <button onclick="
              const btn = this;
              const input = btn.previousElementSibling;
              input.select();
              input.setSelectionRange(0, 99999);
              let ok = false;
              if (navigator.clipboard) {
                navigator.clipboard.writeText('${magnetUrl}').then(() => { ok = true; });
              }
              try { document.execCommand('copy'); ok = true; } catch(e){}
              btn.innerText = '已复制 ✓';
              btn.style.background = '#2da44e';
              setTimeout(() => { btn.innerText = '复制'; btn.style.background = '#0969da'; }, 1500);
            " style="height: 28px; background: #0969da; color: #fff; border: none; border-radius: 4px; padding: 0 12px; font-size: 11px; font-weight: 500; cursor: pointer; white-space: nowrap; -webkit-appearance: none; transition: background 0.2s;">
              复制
            </button>
          </div>
        </div>
      `;
    });
  }
  return html;
}
