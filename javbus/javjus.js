/**
 * Surge Script: JavBus & Miniflux 磁力链接现代化 UI 与一键复制
 */

let body = $response ? $response.body : null;

if (body && (body.includes('magnet:?xt=') || body.includes('uncledatoolsbyajax'))) {

  // 1. 处理 JSON 格式 (SmartRSS / Miniflux API)
  if (body.trim().startsWith('{') || body.trim().startsWith('[')) {
    try {
      let data = JSON.parse(body);
      if (data.items && Array.isArray(data.items)) {
        data.items.forEach(item => {
          if (item.content && item.content.content) {
            item.content.content = renderModernCards(item.content.content);
          }
          if (item.summary && item.summary.content) {
            item.summary.content = renderModernCards(item.summary.content);
          }
        });
        body = JSON.stringify(data);
      }
    } catch (e) {
      console.log('[Magnet Parser] JSON 解析异常: ' + e);
    }
  } else {
    // 2. 处理原生 HTML (Safari 浏览器访问)
    body = renderModernCards(body);
  }

  $done({ body: body });
} else {
  $done({});
}

// 核心渲染函数
function renderModernCards(html) {
  if (!html || !html.includes('magnet:?xt=')) return html;

  // 匹配所有 <tr> 表格行
  const trRegex = /<tr[\s\S]*?<\/tr>/gi;
  if (trRegex.test(html)) {
    html = html.replace(trRegex, (trBlock) => {
      const magnetMatch = trBlock.match(/magnet:\?xt=[^'"\s<>&]+/i);
      if (!magnetMatch) return trBlock;
      const magnetUrl = magnetMatch[0];

      // 提取标题与特性标签
      const nameMatch = trBlock.match(/<td[^>]*width=["']?70%["']?[^>]*>([\s\S]*?)<\/td>/i);
      let title = '磁力链接';
      let isHD = trBlock.includes('高清') || trBlock.includes('HD');
      let isSub = trBlock.includes('字幕') || trBlock.includes('中字');

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

      // 组装精美徽章
      let badges = '';
      if (isSub) badges += '<span style="background: rgba(255, 45, 85, 0.15); color: #ff3b30; border: 1px solid rgba(255, 45, 85, 0.3); font-size: 10px; font-weight: 600; padding: 1px 5px; border-radius: 4px; margin-left: 5px;">中字</span>';
      if (isHD) badges += '<span style="background: rgba(0, 122, 255, 0.15); color: #0a84ff; border: 1px solid rgba(0, 122, 255, 0.3); font-size: 10px; font-weight: 600; padding: 1px 5px; border-radius: 4px; margin-left: 5px;">HD</span>';

      const metaInfo = [size, date].filter(Boolean).join(' · ');

      // 渲染为轻量、紧凑的高颜值卡片
      return `
        <tr style="border: none;">
          <td colspan="3" style="padding: 5px 0;">
            <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 8px 12px; display: flex; flex-direction: column; gap: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 13px; font-weight: 600; color: #58a6ff; display: flex; align-items: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 75%;">
                  🧲 ${title} ${badges}
                </div>
                <div style="font-size: 11px; color: #8b949e; white-space: nowrap;">${metaInfo}</div>
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
                " style="background: #1f6feb; color: #ffffff; border: none; border-radius: 5px; padding: 4px 12px; font-size: 11px; font-weight: 500; cursor: pointer; -webkit-appearance: none; transition: all 0.2s;">
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
