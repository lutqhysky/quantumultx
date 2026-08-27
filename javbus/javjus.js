/**
 * Surge Script: Miniflux (Google Reader API) & JavBus 磁力提取与卡片化
 */

let body = $response ? $response.body : null;

if (body && (body.includes('magnet:?xt=') || body.includes('uncledatoolsbyajax'))) {

  // 1. 如果是 JSON 格式 (SmartRSS 通过 Miniflux API 同步文章正文)
  if (body.trim().startsWith('{') || body.trim().startsWith('[')) {
    try {
      let data = JSON.parse(body);

      // 处理 items 列表中的文章内容
      if (data.items && Array.isArray(data.items)) {
        data.items.forEach(item => {
          if (item.content && item.content.content) {
            item.content.content = formatMagnetHtml(item.content.content);
          }
          if (item.summary && item.summary.content) {
            item.summary.content = formatMagnetHtml(item.summary.content);
          }
        });
        body = JSON.stringify(data);
      }
    } catch (e) {
      console.log('[Miniflux Magnet] JSON 解析失败: ' + e);
    }
  } else {
    // 2. 如果是普通 HTML (Safari 浏览器直连)
    body = formatMagnetHtml(body);
  }

  $done({ body: body });
} else {
  $done({});
}

// 核心 HTML 磁力卡片转换函数
function formatMagnetHtml(html) {
  if (!html || !html.includes('magnet:?xt=')) return html;

  // 匹配表格行 <tr>
  const trRegex = /<tr[\s\S]*?<\/tr>/gi;
  if (trRegex.test(html)) {
    html = html.replace(trRegex, (trBlock) => {
      const magnetMatch = trBlock.match(/magnet:\?xt=[^'"\s<>&]+/i);
      if (!magnetMatch) return trBlock;
      const magnetUrl = magnetMatch[0];

      // 提取番号
      const nameMatch = trBlock.match(/<td[^>]*width=["']?70%["']?[^>]*>([\s\S]*?)<\/td>/i);
      let title = '磁力下载';
      let isHD = trBlock.includes('高清') || trBlock.includes('HD');
      if (nameMatch && nameMatch[1]) {
        title = nameMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      }

      // 提取大小与日期
      const tdList = [...trBlock.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
      let size = '';
      let date = '';
      if (tdList.length >= 3) {
        size = tdList[1][1].replace(/<[^>]+>/g, '').trim();
        date = tdList[2][1].replace(/<[^>]+>/g, '').trim();
      }
      const meta = [size, date].filter(Boolean).join(' · ');
      const hdBadge = isHD ? '<span style="background: linear-gradient(135deg, #007aff, #0051a8); color: #fff; font-size: 10px; font-weight: 600; padding: 1px 5px; border-radius: 4px; margin-left: 6px; vertical-align: middle;">HD</span>' : '';

      // 原生输入框，支持在 SmartRSS 里点按全选复制
      return `
        <tr style="border: none;">
          <td colspan="3" style="padding: 6px 0;">
            <div style="background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; padding: 10px 12px; margin-bottom: 4px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <div style="font-size: 14px; font-weight: 600; color: #3890ff;">
                  🧲 ${title} ${hdBadge}
                </div>
                <div style="font-size: 11px; color: #888;">${meta}</div>
              </div>
              <input type="text" readonly value="${magnetUrl}" onfocus="this.select();" onclick="this.select();" 
                style="width: 100%; box-sizing: border-box; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 6px; padding: 6px 8px; font-family: ui-monospace, Menlo, monospace; font-size: 11px; color: #00e676; outline: none; -webkit-user-select: all; user-select: all;" />
            </div>
          </td>
        </tr>
      `;
    });
  }

  // 匹配孤立的 <a> 标签
  const aRegex = /<a\s+[^>]*href=["'](magnet:\?xt=[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  html = html.replace(aRegex, (match, magnetUrl, linkText) => {
    if (match.includes('input type="text"')) return match;
    const cleanTitle = linkText.replace(/<[^>]+>/g, '').trim();
    return `
      <div style="margin: 8px 0; padding: 8px; border-radius: 8px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);">
        <div style="font-weight: 600; color: #3890ff; font-size: 13px; margin-bottom: 4px;">🔗 ${cleanTitle || '磁力链接'}</div>
        <input type="text" readonly value="${magnetUrl}" onfocus="this.select();" onclick="this.select();" 
          style="width: 100%; box-sizing: border-box; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 6px; padding: 6px 8px; font-family: ui-monospace, Menlo, monospace; font-size: 11px; color: #00e676; outline: none; -webkit-user-select: all; user-select: all;" />
      </div>
    `;
  });

  return html;
}
