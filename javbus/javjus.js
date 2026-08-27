/**
 * Surge Script: JavBus & FreshRSS/SmartRSS 磁力链接提取与明文化
 * 作用: 拦截 JavBus / FreshRSS / RSSHub 输出，强制把 magnet 转换为带复制框的明文
 */

let body = $response ? $response.body : null;

if (body && (body.includes('magnet:?xt=') || body.includes('uncledatoolsbyajax'))) {

  // 1. 处理 JavBus / RSSHub 渲染的 <tr> 表格
  const trRegex = /<tr[\s\S]*?<\/tr>/gi;
  if (trRegex.test(body)) {
    body = body.replace(trRegex, (trBlock) => {
      // 提取磁链 (优先从 onclick 或 href 提取)
      const magnetMatch = trBlock.match(/magnet:\?xt=[^'"\s<>&]+/i);
      if (!magnetMatch) return trBlock;
      const magnetUrl = magnetMatch[0];

      // 提取名称 (番号)
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
      const meta = [size, date].filter(Boolean).join(' | ');
      const hdTag = isHD ? '<span style="background:#0d6efd;color:#fff;font-size:10px;padding:1px 4px;border-radius:3px;margin-left:4px;">HD</span>' : '';

      // 重构成手机端极易长按全选复制的卡片
      return `
        <tr style="border-top: 1px solid #e5e5e5;">
          <td colspan="3" style="padding: 10px 4px;">
            <div style="font-weight: bold; color: #1a73e8; font-size: 13px; margin-bottom: 4px;">
              🧲 ${title} ${hdTag} <span style="font-size: 11px; color: #777; font-weight: normal;">(${meta})</span>
            </div>
            <div style="font-size: 11px; font-family: monospace; color: #111; word-break: break-all; -webkit-user-select: all; user-select: all; background: #f4f7fa; padding: 6px 8px; border-radius: 4px; border: 1px solid #cdd5df; line-height: 1.4;">
              ${magnetUrl}
            </div>
          </td>
        </tr>
      `;
    });
  }

  // 2. 兜底处理：如果不是表格，而是散落的 <a> 标签
  const aRegex = /<a\s+[^>]*href=["'](magnet:\?xt=[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  body = body.replace(aRegex, (match, magnetUrl, linkText) => {
    if (match.includes('-webkit-user-select')) return match;
    const cleanTitle = linkText.replace(/<[^>]+>/g, '').trim();
    return `
      <div style="margin: 8px 0; padding: 8px; border: 1px dashed #4a90e2; border-radius: 4px; background: #f7f9fc;">
        <div style="font-weight: bold; color: #1a73e8; font-size: 12px; margin-bottom: 4px;">🔗 ${cleanTitle || '磁力链接'}</div>
        <div style="font-size: 11px; font-family: monospace; word-break: break-all; user-select: all; -webkit-user-select: all; background: #fff; padding: 6px; border: 1px solid #d0d7de; border-radius: 4px;">${magnetUrl}</div>
      </div>
    `;
  });

  $done({ body: body });
} else {
  $done({});
}
