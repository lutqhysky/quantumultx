/**
 * Surge Script: Miniflux & SmartRSS 通用磁力卡片化 (JavBus 表格 + 草榴 rmdown + 裸磁链)
 *
 * 双模式：
 * - HTML 分支（Safari 直接浏览）：米黄圆角卡片 + JS 复制磁力按钮（样式与交互完整）
 * - JSON 分支（Miniflux / SmartRSS API）：净化器安全版卡片——只用 Miniflux 白名单标签
 *   （p/strong/pre/a[href]），无 div/span、无内联样式、无 JS；magnet: 在 Miniflux
 *   validURISchemes 白名单内，<a href="magnet:..."> 可保留，点击直接调用 BT 客户端
 *
 * 2026-11-01 更新（SmartRSS 全量覆盖）：
 * - JSON 分支补 Fever API 的 html 字段（Fever 条目正文不在 content，在 html）；
 * - 补【驗證全碼】兜底：帖子只有 40 位 hash、没有裸磁链时，从 hash 建磁链追加到文末；
 * - JSON 顶层数组也处理。
 */

// === 磁力卡片样式（与「代表作」磁力页统一：米黄圆角卡片 + 复制磁力按钮） ===
const CARD_WRAP = 'display:block;margin:12px 0 16px 0;clear:both;';
const CARD_BOX = 'background:#f7f2e9;border:1px solid #e9e1d2;border-radius:12px;overflow:hidden;';
const MAG_TEXT = 'padding:12px 14px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;line-height:1.5;color:#3a3a3a;word-break:break-all;-webkit-user-select:all;user-select:all;';
const COPY_BTN = 'border-top:1px solid #e9e1d2;padding:11px 14px;color:#c0392b;font-size:14px;font-weight:600;cursor:pointer;-webkit-tap-highlight-color:transparent;';
// 自包含的复制逻辑：不依赖外部 <script>，从相邻 data-mag 元素读取磁链；
// 复制成功后该行变红底白字并提示「已复制 ✓」
const COPY_JS = "(function(b){var t=b.parentNode.querySelector('[data-mag]').innerText;var ok=false;try{var ta=document.createElement('textarea');ta.value=t;ta.setAttribute('readonly','');ta.style.cssText='position:fixed;top:0;left:0;opacity:0;';document.body.appendChild(ta);ta.select();try{ta.setSelectionRange(0,ta.value.length);}catch(_){}ok=document.execCommand('copy');document.body.removeChild(ta);}catch(e){}if(ok){b.style.background='#b8332a';b.style.color='#ffffff';b.textContent='已复制 \u2713';}})(this)";
// 净化器安全版复制逻辑：从页面第一个 [data-magsafe] 的 <pre> 里读磁链；
// SmartRSS 若剥离 onclick 则此按钮失效，届时改用长按磁链手动复制（见 magnetCardSafe）
const COPY_JS_SAFE = "(function(b){var p=document.querySelector('[data-magsafe]');if(!p)return;var t=p.innerText;var ok=false;try{var ta=document.createElement('textarea');ta.value=t;ta.setAttribute('readonly','');ta.style.cssText='position:fixed;top:0;left:0;opacity:0;';document.body.appendChild(ta);ta.select();try{ta.setSelectionRange(0,ta.value.length);}catch(_){}ok=document.execCommand('copy');document.body.removeChild(ta);}catch(e){}if(ok){b.style.background='#b8332a';b.style.color='#ffffff';b.textContent='已复制 \u2713';}})(this)";


// === 通用磁力卡片（米黄圆角 + 复制磁力按钮，仅 HTML 分支） ===
function magnetCard(magnetUrl) {
  return `
      <div style="${CARD_WRAP}">
        <div style="${CARD_BOX}">
          <div data-mag style="${MAG_TEXT}">${magnetUrl}</div>
          <div onclick="${COPY_JS}" style="${COPY_BTN}">复制磁力</div>
        </div>
      </div>
    `;
}

// === 净化器安全版磁力卡片（仅 JSON/Miniflux 分支）===
// Miniflux 后端净化器会剥离 div/span/button、style/class/on* 属性及 script/style 标签，
// 因此只用白名单标签与属性。JS 复制不可用，改用 <a href="magnet:"> 点击直调 BT 客户端，
// 磁链原文放在 <pre> 里长按可手动复制。
function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function magnetCardSafe(magnetUrl) {
  const safe = escHtml(magnetUrl);
  // 让长磁链换行显示、不被屏幕边缘截断：每 16 个可见字符插一个 <wbr>；
  // <wbr> 不产生任何字符，复制出来的磁链是干净的；跳过 &...; 实体不拆散。
  const wrapped = (function (s) {
    let out = '', count = 0, i = 0;
    while (i < s.length) {
      if (s[i] === '&') {
        const semi = s.indexOf(';', i);
        if (semi !== -1) { out += s.slice(i, semi + 1); i = semi + 1; continue; }
      }
      out += s[i]; count++; i++;
      if (count % 16 === 0) out += '<wbr>';
    }
    return out;
  })(safe);
  return `
      <hr>
      <p><strong>🧲 磁力连接</strong></p>
      <pre data-magsafe style="white-space:pre-wrap;word-break:break-all;overflow-wrap:anywhere;-webkit-user-select:all;user-select:all;">${wrapped}</pre>
      <p><a href="${safe}">👆 点此调用 BT 客户端打开</a></p>
      <p><span onclick="${COPY_JS_SAFE}" style="color:#c0392b;font-weight:600;cursor:pointer;">📋 点此复制磁力</span>（长按上方磁链可手动复制）</p>
    `;
}
// 按分支选择卡片构建器
function cardBuilder(safe) { return safe ? magnetCardSafe : magnetCard; }


let body = $response ? $response.body : null;

if (body) {
  // 1. 处理 SmartRSS / Miniflux API (JSON 数据)
  if (body.trim().startsWith('{') || body.trim().startsWith('[')) {
    try {
      let data = JSON.parse(body);
      const processItem = (item) => {
        if (item.content && typeof item.content === 'string') {
          item.content = handleAllMagnets(item.content, true);
        } else if (item.content && item.content.content) {
          item.content.content = handleAllMagnets(item.content.content, true);
        }
        if (item.summary && typeof item.summary === 'string') {
          item.summary = handleAllMagnets(item.summary, true);
        } else if (item.summary && item.summary.content) {
          item.summary.content = handleAllMagnets(item.summary.content, true);
        }
        // Fever API：正文在 html 字段（不是 content），SmartRSS 走 Fever 同步时靠这一条
        if (item.html && typeof item.html === 'string') {
          item.html = handleAllMagnets(item.html, true);
        }
      };

      if (Array.isArray(data)) data.forEach(processItem);
      if (data.items && Array.isArray(data.items)) data.items.forEach(processItem);
      if (data.entries && Array.isArray(data.entries)) data.entries.forEach(processItem);
      body = JSON.stringify(data);
    } catch (e) {
      console.log('[Miniflux Parser] JSON 解析异常: ' + e);
    }
  } else {
    // 2. 处理普通 HTML 网页
    // Miniflux 网页自带 CSP meta 标签（style-src/script-src 仅允许 nonce），会拦截内联样式和 onclick，
    // 导致注入的卡片无样式。直接移除该标签（私有单用户实例，风险可忽略；Miniflux 自身 UI 不受影响）。
    body = body.replace(/<meta[^>]*http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi, '');
    body = handleAllMagnets(body);
  }

  $done({ body: body });
} else {
  $done({});
}

function handleAllMagnets(html, safe) {
  if (!html) return html;
  html = parseJavBus(html, safe);
  html = parseT66y(html, safe);
  html = parsePlainMagnets(html, safe);
  html = parseVerifyHash(html, safe);
  return html;
}

// === 1. JavBus 表格解析与重构 ===
function parseJavBus(html, safe) {
  if (!html.includes('magnet:?xt=')) return html;
  const buildCard = cardBuilder(safe);

  // 1. 匹配并重构每一行 <tr>
  const trRegex = /<tr[\s\S]*?<\/tr>/gi;
  html = html.replace(trRegex, (trBlock) => {
    const magnetMatch = trBlock.match(/magnet:\?xt=[^'"\s<>&]+/i);
    if (!magnetMatch) return ''; // 过滤掉无磁链的纯表头行

    const magnetUrl = magnetMatch[0];

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

    if (safe) {
      // 净化器安全版标题行：纯文本徽标，无 span/div/style
      const badges = (isSub ? ' [中字]' : '') + (isHD ? ' [HD]' : '');
      return `
      <p><strong>🧲 ${title}${badges} (${meta})</strong></p>
      ${buildCard(magnetUrl)}
    `;
    }

    let badges = '';
    if (isSub) badges += ' <span style="color:#ff3b30;font-weight:bold;font-size:11px;">[中字]</span>';
    if (isHD) badges += ' <span style="color:#0a84ff;font-weight:bold;font-size:11px;">[HD]</span>';

    // 采用带外边距的独立块级卡片，强制换行不粘连
    return `
      <div style="font-size: 13px; font-weight: bold; color: #24292f; margin: 12px 0 6px 0; line-height: 1.4; clear: both;">
        🧲 ${title}${badges} <span style="font-size: 11px; color: #888; font-weight: normal;">(${meta})</span>
      </div>
      ${buildCard(magnetUrl)}
    `;
  });

  // 2. 清理残余的空 <table> 标签及悬空的“磁力名稱 檔案大小 分享日期”表头
  html = html.replace(/<table[^>]*>[\s\S]*?<\/table>/gi, (tableBlock) => {
    // 如果表格里已经包含了我们渲染的 <blockquote> 卡片，直接把 table 壳剥掉返回内容
    return tableBlock.replace(/<\/?(table|tbody|thead|tfoot|tr|td|th)[^>]*>/gi, '');
  });
  html = html.replace(/磁力名稱[\s\S]*?分享日期/gi, '');

  return html;
}

// === 2. 草榴 / rmdown 解析 ===
function parseT66y(html, safe) {
  const rmdownRegex = /(?:<a[^>]*href=["'])?(https?:\/\/(?:www\.)?rmdown\.com\/link\.php\?hash=([a-zA-Z0-9]+))(?:["'][^>]*>[\s\S]*?<\/a>)?/gi;

  if (rmdownRegex.test(html)) {
    html = html.replace(rmdownRegex, (match, fullUrl, rawHash) => {
      let realHash = rawHash;
      if (rawHash && rawHash.length > 40) {
        realHash = rawHash.slice(-40);
      }
      const magnetUrl = `magnet:?xt=urn:btih:${realHash.toUpperCase()}`;

      return cardBuilder(safe)(magnetUrl);
    });
  }
  return html;
}

// === 3. 裸磁链（纯文本 magnet:?xt=urn:btih:HASH，如 t66y 帖文）卡片化 ===
function parsePlainMagnets(html, safe) {
  if (!html || html.indexOf('magnet:?') === -1) return html;
  const buildCard = cardBuilder(safe);

  // 先把 magnet:? 与 xt= 之间的 <br>/换行/分段合并，避免切分器把它们拆到不同文本块
  html = html.replace(/(magnet:\?)\s*((?:<br\s*\/?>|<\/?(?:p|div)[^>]*>)\s*)+(?=xt=urn:btih:)/gi, '$1');

  // 暂存已生成的卡片（HTML 注释形式），避免重复处理卡片内的磁链；
  // 注释会被切分器视为"标签"而自然跳过
  const stash = [];
  html = html.replace(/(<div data-mag[\s\S]*?<\/div>|<pre data-magsafe>[\s\S]*?<\/pre>)/gi, (m) => {
    stash.push(m);
    return '<!--MAGSTASH' + (stash.length - 1) + '-->';
  });

  // 按标签/文本切分，只处理文本节点（跳过标签属性里的磁链）
  const parts = html.split(/(<[^>]*>)/g);
  // 允许 magnet:? 与 xt= 之间有换行/空格/<br>；hash 后可带 &dn= 等参数
  const magnetRe = /(magnet:\?\s*xt=urn:btih:\s*[a-zA-Z0-9]{40}[^<>\s]*)/gi;
  for (let i = 0; i < parts.length; i += 2) {
    parts[i] = parts[i].replace(magnetRe, (full) => {
      const magnetUrl = full.replace(/\s+/g, '').replace(/<br\s*\/?>/gi, '').replace(/&amp;/gi, '&');
      return buildCard(magnetUrl);
    });
  }
  html = parts.join('');

  // 还原暂存的卡片
  html = html.replace(/<!--MAGSTASH(\d+)-->/g, (m, id) => stash[+id]);
  return html;
}

// === 4. 【驗證全碼】兜底：帖子只有 40 位 hash、没有裸磁链/rmdown 链接时，从 hash 建磁链 ===
// t66y 帖文常只给【驗證全碼】（即 info hash），前面三步都够不着；此时把磁链卡片追加到文末，
// 保证 SmartRSS 里最下面一定能看到磁力。同一 hash 的磁链已存在时不再追加，避免重复。
function parseVerifyHash(html, safe) {
  if (!html) return html;
  const m = html.match(/【驗[證证]全[碼码]】\s*[：:]\s*([a-fA-F0-9]{40})/);
  if (!m) return html;
  const hash = m[1].toLowerCase();
  if (html.toLowerCase().indexOf('btih:' + hash) !== -1) return html;
  const magnetUrl = 'magnet:?xt=urn:btih:' + hash.toUpperCase();
  return html + cardBuilder(safe)(magnetUrl);
}
