/**
 * Surge Script: JavBus 磁力链接提取与明文化渲染
 * 作用: 解析 uncledatoolsbyajax.php 接口，生成带明文与复制按钮的磁力卡片
 */

let body = $response.body;

if (body && body.includes('magnet:?xt=')) {
  // 匹配每一个包含磁力链接的 <tr> 行
  const trRegex = /<tr[\s\S]*?onclick="window\.open\('(magnet:\?xt=[^']+)'[\s\S]*?<\/tr>/gi;

  body = body.replace(trRegex, (trBlock, magnetUrl) => {
    // 1. 提取磁力名称（如 START-607）
    const nameMatch = trBlock.match(/<td\s+width="70%"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i);
    let title = '磁力下载';
    let isHD = false;
    if (nameMatch && nameMatch[1]) {
      isHD = nameMatch[1].includes('高清');
      // 去除内部标签获取纯文本
      title = nameMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    }

    // 2. 提取文件大小（如 6.05GB）
    const sizeMatch = trBlock.match(/<td[^>]*style="text-align:center[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/td>/i);
    const size = sizeMatch && sizeMatch[1] ? sizeMatch[1].replace(/<[^>]+>/g, '').trim() : '';

    // 3. 提取分享日期（如 2026-08-24）
    const dateMatches = [...trBlock.matchAll(/<td[^>]*style="text-align:center[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/td>/gi)];
    const date = dateMatches.length >= 2 ? dateMatches[1][1].replace(/<[^>]+>/g, '').trim() : '';

    // 4. 构建高清角标与信息头
    const hdTag = isHD ? '<span style="background-color: #0d6efd; color: #fff; font-size: 10px; padding: 1px 4px; border-radius: 3px; margin-left: 5px;">HD高清</span>' : '';
    const metaInfo = [size, date].filter(Boolean).join(' | ');

    // 5. 渲染为移动端友好的明文复制卡片
    return `
      <tr style="border-top: 1px solid #e0e0e0;">
        <td colspan="3" style="padding: 8px 4px;">
          <div style="font-weight: bold; color: #1a73e8; margin-bottom: 4px; font-size: 13px;">
            🧲 ${title} ${hdTag} 
            <span style="font-size: 11px; color: #666; font-weight: normal; margin-left: 8px;">(${metaInfo})</span>
          </div>
          <div style="font-size: 11px; font-family: monospace; color: #222; word-break: break-all; -webkit-user-select: all; user-select: all; background-color: #f6f8fa; padding: 6px 8px; border-radius: 4px; border: 1px solid #d0d7de; line-height: 1.4;">
            ${magnetUrl}
          </div>
        </td>
      </tr>
    `;
  });

  $done({ body: body });
} else {
  $done({});
}
