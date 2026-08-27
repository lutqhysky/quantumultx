/**
 * Surge Script: JavBus 磁力链接优雅卡片化与一键复制
 */

let body = $response ? $response.body : null;

if (body && (body.includes('magnet:?xt=') || body.includes('uncledatoolsbyajax'))) {

  // 1. 处理 JavBus / RSS 表格行
  const trRegex = /<tr[\s\S]*?<\/tr>/gi;
  if (trRegex.test(body)) {
    body = body.replace(trRegex, (trBlock) => {
      // 提取磁链
      const magnetMatch = trBlock.match(/magnet:\?xt=[^'"\s<>&]+/i);
      if (!magnetMatch) return trBlock;
      const magnetUrl = magnetMatch[0];

      // 提取 Hash 短码 (用于简洁展示)
      const hashMatch = magnetUrl.match(/btih:([a-zA-Z0-9]{8})/i);
      const shortHash = hashMatch ? hashMatch[1].toUpperCase() + '...' : 'Magnet';

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

      // 现代精致卡片 UI
      return `
        <tr style="border: none;">
          <td colspan="3" style="padding: 6px 0;">
            <div style="background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; padding: 10px 12px; margin-bottom: 2px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <div style="font-size: 14px; font-weight: 600; color: #3890ff; display: flex; align-items: center;">
                  🧲 ${title} ${hdBadge}
                </div>
                <div style="font-size: 11px; color: #888;">${meta}</div>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0, 0, 0, 0.25); border-radius: 6px; padding: 5px 8px; border: 1px solid rgba(255, 255, 255, 0.05);">
                <span style="font-family: ui-monospace, Menlo, monospace; font-size: 11px; color: #aaa; user-select: all; -webkit-user-select: all;">${shortHash}</span>
                <button onclick="navigator.clipboard.writeText('${magnetUrl}').then(()=>{this.innerText='已复制 ✓';this.style.background='#28a745';setTimeout(()=>{this.innerText='复制';this.style.background='#007aff'},1500)}).catch(()=>{prompt('请手动长按复制:', '${magnetUrl}')})" 
                  style="background: #007aff; color: #fff; border: none; border-radius: 4px; padding: 3px 10px; font-size: 11px; font-weight: 500; cursor: pointer; -webkit-appearance: none;">
                  复制
                </button>
              </div>
              <div style="display: none;">${magnetUrl}</div>
            </div>
          </td>
        </tr>
      `;
    });
  }

  $done({ body: body });
} else {
  $done({});
}
