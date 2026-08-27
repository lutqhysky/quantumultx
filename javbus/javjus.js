/**
 * Surge Script: JavBus 磁力链接原生美化与一键复制 (V3.0)
 */

let body = $response ? $response.body : null;

if (body && (body.includes('magnet:?xt=') || body.includes('uncledatoolsbyajax'))) {

  // 1. 处理 JSON 格式 (针对 Miniflux API / SmartRSS)
  if (body.trim().startsWith('{') || body.trim().startsWith('[')) {
    try {
      let data = JSON.parse(body);
      const processItem = (item) => {
        if (item.content && typeof item.content === 'string') {
          item.content = transformMagnets(item.content);
        } else if (item.content && item.content.content) {
          item.content.content = transformMagnets(item.content.content);
        }
        if (item.summary && typeof item.summary === 'string') {
          item.summary = transformMagnets(item.summary);
        } else if (item.summary && item.summary.content) {
          item.summary.content = transformMagnets(item.summary.content);
        }
      };

      if (data.items && Array.isArray(data.items)) data.items.forEach(processItem);
      if (data.entries && Array.isArray(data.entries)) data.entries.forEach(processItem);
      body = JSON.stringify(data);
    } catch (e) {
      console.log('[Magnet Parser] JSON 解析异常: ' + e);
    }
  } else {
    // 2. 处理 HTML 网页 (Safari)
    body = transformMagnets(body);
  }

  $done({ body: body });
} else {
  $done({});
}

function transformMagnets(html) {
  if (!html || !html.includes('magnet:?xt=')) return html;

  const trRegex = /<tr[\s\S]*?<\/tr>/gi;
  if (trRegex.test(html)) {
    html = html.replace(trRegex, (trBlock) => {
      // 提取完整磁链
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

      // 徽章
      let badges = '';
      if (isSub) badges += '<span style="background: rgba(255, 45, 85, 0.2); color: #ff3b30; font-size: 10px; font-weight: bold; padding: 1px 4px; border-radius: 4px; margin-left: 5px;">中字</span>';
      if (isHD) badges += '<span style="background: rgba(0, 122, 255, 0.2); color: #0a84ff; font-size: 10px; font-weight: bold; padding: 1px 4px; border-radius: 4px; margin-left: 5px;">HD</span>';

      // 极简原生卡片布局（无笨重输入框，带渐变复制按钮）
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
