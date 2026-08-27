/**
 * Surge Script: JavBus & Miniflux 磁力链接优雅卡片化与一键复制 (全场景版)
 */

let body = $response ? $response.body : null;

if (body && (body.includes('magnet:?xt=') || body.includes('uncledatoolsbyajax'))) {

  // 1. 处理 SmartRSS / Miniflux API (JSON 数据)
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
    // 2. 处理 Safari 网页端
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
      const magnetMatch = trBlock.match(/magnet:\?xt=[^'"\s<>&]+/i);
      if (!magnetMatch) return trBlock;
      const magnetUrl = magnetMatch[0];

      // 提取番号与标签
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
      if (isSub) badges += '<span style="background: rgba(255, 45, 85, 0.2); color: #ff3b30; font-size: 10px; font-weight: 600; padding: 1px 4px; border-radius: 4px; margin-left: 5px;">中字</span>';
      if (isHD) badges += '<span style="background: rgba(0, 122, 255, 0.2); color: #0a84ff; font-size: 10px; font-weight: 600; padding: 1px 4px; border-radius: 4px; margin-left: 5px;">HD</span>';

      return `
        <tr style="border-top: 1px solid rgba(255, 255, 255, 0.08);">
          <td colspan="3" style="padding: 6px 2px;">
            <div style="background: rgba(255, 255, 255, 0.05); border-radius: 6px; padding: 8px 10px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <div style="font-size: 13px; font-weight: 600; color: #58a6ff;">🧲 ${title} ${badges}</div>
                <div style="font-size: 11px; color: #888;">${meta}</div>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <input type="text" readonly value="${magnetUrl}" onfocus="this.select();" onclick="this.select();" 
                  style="flex: 1; height: 26px; box-sizing: border-box; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.12); border-radius: 4px; padding: 0 6px; font-family: monospace; font-size: 10px; color: #7ee787; outline: none; -webkit-user-select: all; user-select: all;" />
              </div>
            </div>
          </td>
        </tr>
      `;
    });
  }
  return html;
}
