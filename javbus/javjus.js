/**
 * Surge Script: JavBus & Miniflux 磁力链接提取与卡片化
 * 兼容: Safari 网页端 + Miniflux API (SmartRSS 客户端)
 */

let body = $response ? $response.body : null;

if (body && (body.includes('magnet:?xt=') || body.includes('uncledatoolsbyajax'))) {

  // 1. 处理 JavBus 原生表格 / RSS 内容表格
  const trRegex = /<tr[\s\S]*?<\/tr>/gi;
  if (trRegex.test(body)) {
    body = body.replace(trRegex, (trBlock) => {
      // 提取磁链
      const magnetMatch = trBlock.match(/magnet:\?xt=[^'"\s<>&]+/i);
      if (!magnetMatch) return trBlock;
      const magnetUrl = magnetMatch[0];

      // 提取番号/名称
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

      // 纯原生输入框方案：不依赖 JS，点一下直接在 iOS 唤起全选复制
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

  // 2. 针对 Miniflux API 返回的 JSON 格式或纯 <a> 标签兜底
  const aRegex = /<a\s+[^>]*href=["'](magnet:\?xt=[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  body = body.replace(aRegex, (match, magnetUrl, linkText) => {
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

  $done({ body: body });
} else {
  $done({});
}
