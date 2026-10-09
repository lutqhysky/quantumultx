// mycomic-chapters.js
// Surge http-response 脚本：把 mycomic 详情页里 Alpine.js 藏在 x-data 的章节 JSON
// 抠出来，生成静态章节链接注入 HTML，并删掉推荐区别漫画的章节链接。
// 解决 Yealico 不执行页面 JS、抓不到本作章节的问题。
//
// Surge 配置：
//   [Script]
//   mycomic-chapters = type=http-response, pattern=^https://mycomic\.com/(cn/)?comics/\d+, script-path=mycomic-chapters.js, requires-body=true, timeout=30
//   [MITM]
//   hostname = %APPEND% mycomic.com

var CHAPTERS_RE = /chapters:\s*\[/g;

// 从 body 中抠出所有 `chapters: [...]` 数组（引号感知的括号匹配，标题里的 ] 不会误伤）
function extractAllChapters(body) {
  var all = [];
  var m;
  CHAPTERS_RE.lastIndex = 0;
  while ((m = CHAPTERS_RE.exec(body)) !== null) {
    var start = m.index + m[0].length - 1; // '[' 的位置
    var depth = 0, inStr = false, esc = false, i;
    for (i = start; i < body.length; i++) {
      var c = body.charAt(i);
      if (inStr) {
        if (esc) esc = false;
        else if (c === '\\') esc = true;
        else if (c === '"') inStr = false;
      } else {
        if (c === '"') inStr = true;
        else if (c === '[') depth++;
        else if (c === ']') {
          depth--;
          if (depth === 0) break;
        }
      }
    }
    if (depth !== 0) continue; // 括号没闭合，跳过
    var arrStr = body.slice(start, i + 1).replace(/&quot;/g, '"').replace(/&#0?34;|&#x22;/gi, '"');
    try {
      var arr = JSON.parse(arrStr);
      if (Array.isArray(arr)) {
        for (var k = 0; k < arr.length; k++) {
          if (arr[k] && arr[k].id != null) all.push(arr[k]);
        }
      }
    } catch (e) { /* 解析失败就跳过这一段 */ }
    CHAPTERS_RE.lastIndex = i + 1; // 从数组结尾继续找下一段
  }
  return all;
}

function escHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function main() {
  var body = ($response && $response.body) || '';
  if (!body || body.indexOf('chapters:') === -1) $done({});

  var chapters = extractAllChapters(body);
  if (!chapters.length) $done({});

  // 生成静态章节链接（保持站点原有倒序：最新在前）
  var links = '';
  for (var i = 0; i < chapters.length; i++) {
    links += '<a href="https://mycomic.com/cn/chapters/' + chapters[i].id + '">' + escHtml(chapters[i].title) + '</a>';
  }

  // 删掉原页面里所有 /chapters/ 链接（推荐区别漫画 + 開始閱讀），只留我们注入的
  body = body.replace(/<a\b[^>]*?href=(["'])[^"']*?\/chapters\/\d+\1[^>]*>[\s\S]*?<\/a>/gi, '');

  // 紧跟 <body> 注入章节列表（display:none 不影响浏览器打开时的排版）
  var inject = '<div id="yealico-chapters" style="display:none">' + links + '</div>';
  if (/<body[^>]*>/i.test(body)) {
    body = body.replace(/(<body[^>]*>)/i, '$1' + inject);
  } else {
    body = inject + body;
  }

  $done({ body: body });
}

main();
