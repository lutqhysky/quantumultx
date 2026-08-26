/**
 * Surge Script: JavBus & FreshRSS/SmartRSS 磁力链接提取与明文化
 * 兼容: JavBus 网页端 Ajax 接口 + FreshRSS API / 阅读器文章输出
 */

let body = $response ? $response.body : null;

if (body && (body.includes('magnet:?xt=') || body.includes('uncledatoolsbyajax'))) {
  // 1. 匹配 JavBus 原生表格 <tr> 结构
  const trRegex = /<tr[\s\S]*?<\/tr>/gi;

  if (trRegex.test(body)) {
    body = body.replace(trRegex, (trBlock) => {
      // 提取 magnet 链接 (无论在 onclick 还是 href)
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

      // 提取体积与日期
      const tdList = [...trBlock.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
      let size = '';
      let date = '';
      if (tdList.length >= 3) {
        size = tdList[1][1].replace(/<[^>]+>/g, '').trim();
        date = tdList[2][1].replace(/<[^>]+>/g, '').trim();
      }
      const meta = [size, date].filter(Boolean).join(' | ');
      const hdTag = isHD ? '<span style="background:#0d6efd;color:#fff;font-size:10px;padding:1px 4px;border-radius:3px;margin-left:4px;">HD</span>' : '';

      return `
        <tr style="border-top: 1px solid #ddd;">
          <td colspan="3" style="padding: 8px 4px;">
            <div style="font-weight: bold; color: #1a73e8; font-size: 13px; margin-bottom: 4px;">
              🧲 ${title} ${hdTag} <span style="font-size: 11px; color: #666; font-weight: normal;">(${meta})</span>
            </div>
            <div style="font-size: 11px; font-family: monospace; color: #222; word-break: break-all; -webkit-user-select: all; user-select: all; background: #f6f8fa; padding: 6px 8px; border-radius: 4px; border: 1px solid #ccc; line-height: 1.4;">
              ${magnetUrl}
            </div>
          </td>
        </tr>
      `;
    });
  }

  // 2. 匹配 RSS / 普通 HTML 中的纯 <a> 标签 (针对 SmartRSS / FreshRSS 界面)
  const aRegex = /<a\s+[^>]*href=["'](magnet:\?xt=[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  body = body.replace(aRegex, (match, magnetUrl, linkText) => {
    // 避免重复渲染已经包装过的表格
    if (match.includes('-webkit-user-select')) return match;
    const cleanTitle = linkText.replace(/<[^>]+>/g, '').trim();
    return `
      <div style="margin: 6px 0; padding: 6px; border: 1px dashed #4a90e2; border-radius: 4px; background: #f7f9fc;">
        <div style="font-weight: bold; color: #1a73e8; font-size: 12px; margin-bottom: 2px;">🔗 ${cleanTitle || '磁力链接'}</div>
        <div style="font-size: 11px; word-break: break-all; user-select: all; -webkit-user-select: all; background: #fff; padding: 4px; border: 1px solid #e0e0e0; border-radius: 3px;">${magnetUrl}</div>
      </div>
    `;
  });

  $done({ body: body });
} else {
  $done({});
}
