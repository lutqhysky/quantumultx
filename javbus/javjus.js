/**
 * Surge Script: JavBus & Miniflux 磁力链接提取与卡片化 (全兼容版)
 */

let body = $response ? $response.body : null;

if (body && (body.includes('magnet:?xt=') || body.includes('uncledatoolsbyajax'))) {

  // 1. 如果是 JSON 格式 (SmartRSS / GReader API 同步)
  if (body.trim().startsWith('{') || body.trim().startsWith('[')) {
    try {
      let data = JSON.parse(body);
      
      const processItem = (item) => {
        if (item.content && typeof item.content === 'string') {
          item.content = transformMagnets(item.content);
        } else if (item.content && item.content.content) {
          item.content.content = transformMagnets(item.content.content);
        }
        if (item.summary && item.summary.content) {
          item.summary.content = transformMagnets(item.summary.content);
        }
      };

      if (data.items && Array.isArray(data.items)) {
        data.items.forEach(processItem);
      } else if (data.entries && Array.isArray(data.entries)) {
        data.entries.forEach(processItem);
      }
      body = JSON.stringify(data);
    } catch (e) {
      console.log('[Magnet Parser] JSON 解析异常: ' + e);
    }
  } else {
    // 2. 如果是 HTML 网页 (Miniflux 网页端 或 JavBus 原站)
    body = transformMagnets(body);
  }

  $done({ body: body });
} else {
  $done({});
}

// 核心转换函数
function transformMagnets(html) {
  if (!html || !html.includes('magnet:?xt=')) return html;

  // 匹配每一个 <tr> 表格行
  const trRegex = /<tr[\s\S]*?<\/tr>/gi;
  if (trRegex.test(html)) {
    html = html.replace(trRegex, (trBlock) => {
      // 提取磁链 (同时兼容 href 与 onclick)
      const magnetMatch = trBlock.match(/magnet:\?xt=[^'"\s<>&]+/i);
      if (!magnetMatch) return trBlock;
      const magnetUrl = magnetMatch[0];

      // 提取名称
      const tdList = [...trBlock.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
      let title = '磁力下载';
      let isHD = trBlock.includes('高清') || trBlock.includes('HD');
      let isSub = trBlock.includes('字幕') || trBlock.includes('中字');

      if (tdList.length >= 1) {
        title = tdList[0][1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() || title;
      }

      // 提取大小与日期
      let size = tdList.length >= 2 ? tdList[1][1].replace(/<[^>]+>/g, '').trim() : '';
      let date = tdList.length >= 3 ? tdList[2][1].replace(/<[^>]+>/g, '').trim() : '';
      const meta = [size, date].filter(Boolean).join(' · ');

      // 徽章
      let badges = '';
      if (isSub) badges += '<span style="background: rgba(255, 45, 85, 0.15); color: #ff3b30; border: 1px solid rgba(255, 45, 85, 0.3); font-size: 10px; font-weight: 600; padding: 1px 4px; border-radius: 4px; margin-left: 5px;">中字</span>';
      if (isHD) badges += '<span style="background: rgba(0, 122, 255, 0.15); color: #0a84ff; border: 1px solid rgba(0, 122, 255, 0.3); font-size: 10px; font-weight: 600; padding: 1px 4px; border-radius: 4px; margin-left: 5px;">HD</span>';

      // 返回纯 HTML/CSS 结构（不依赖外部 JS，iOS 完美全选复制）
      return `
        <tr style="border-top: 1px solid rgba(255, 255, 255, 0.08);">
          <td colspan="3" style="padding: 8px 4px;">
            <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px; padding: 8px 10px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <div style="font-size: 13px; font-weight: bold; color: #58a6ff;">
                  🧲 ${title} ${badges}
                </div>
                <div style="font-size: 11px; color: #8b949e;">${meta}</div>
              </div>
              <input type="text" readonly value="${magnetUrl}" onfocus="this.select();" onclick="this.select();" 
                style="width: 100%; box-sizing: border-box; background: rgba(0, 0, 0, 0.35); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 4px; padding: 6px 8px; font-family: ui-monospace, Menlo, monospace; font-size: 11px; color: #3fb950; outline: none; -webkit-user-select: all; user-select: all;" />
            </div>
          </td>
        </tr>
      `;
    });
  }

  // 兜底孤立 <a> 标签
  const aRegex = /<a\s+[^>]*href=["'](magnet:\?xt=[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  html = html.replace(aRegex, (match, magnetUrl, linkText) => {
    if (match.includes('input type="text"')) return match;
    const cleanTitle = linkText.replace(/<[^>]+>/g, '').trim();
    return `
      <div style="margin: 6px 0; padding: 6px; border-radius: 6px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);">
        <div style="font-weight: 600; color: #58a6ff; font-size: 12px; margin-bottom: 4px;">🔗 ${cleanTitle || '磁力链接'}</div>
        <input type="text" readonly value="${magnetUrl}" onfocus="this.select();" onclick="this.select();" 
          style="width: 100%; box-sizing: border-box; background: rgba(0, 0, 0, 0.35); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 4px; padding: 5px 8px; font-family: ui-monospace, Menlo, monospace; font-size: 11px; color: #3fb950; outline: none; -webkit-user-select: all; user-select: all;" />
      </div>
    `;
  });

  return html;
}
