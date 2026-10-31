// JavVerse 去广告 v1.2.0（2026-10-31）
// v2 教训：改了 body 却原样带回旧的 Content-Length / Content-Encoding，
//         浏览器按旧声明读新内容会解码失败 → 整页 "couldn't load"。
// v3 修复：
//   1) 只处理 HTML 文档（Content-Type 含 text/html，或 body 像 HTML），
//      接口 JSON 等一律原样透传，避免误伤；
//   2) 改完 body 后：删 Content-Encoding / Transfer-Encoding，
//      Content-Length 按新 body 的 UTF-8 字节数重算；
//   3) 删 CSP 响应头，保证注入的盯梢脚本不被拦截；
//   4) 盯梢脚本不变：广告容器一旦出现在 DOM 里就删。
(function () {
  var body = $response.body || '';
  var headers = $response.headers || {};
  function headerVal(name) {
    for (var k in headers) if (k.toLowerCase() === name) return headers[k];
    return '';
  }
  var ct = headerVal('content-type');
  var isHtml = /text\/html/i.test(ct) || /^[\s\S]{0,2000}<(html|!doctype)/i.test(body);
  if (!isHtml) { $done({}); return; }
  var pats = [
    /<aside[^>]*aria-label\s*=\s*(["'])Advertisement\1[^>]*>[\s\S]*?<\/aside>/gi,
    /<div[^>]*aria-label\s*=\s*(["'])Advertisement\1[^>]*>[\s\S]*?<\/div>/gi
  ];
  var out = body;
  for (var i = 0; i < pats.length; i++) out = out.replace(pats[i], '');
  var OBS = '<script>(function(){function clean(){'
    + 'document.querySelectorAll("[aria-label]").forEach(function(el){'
    + 'var l=(el.getAttribute("aria-label")||"").toLowerCase();'
    + 'if(l.indexOf("advertisement")!==-1){el.remove();}});'
    + 'document.querySelectorAll("a[href*=\\"play-lustgoddess\\"],a[href*=\\"ourdream.ai\\"]").forEach(function(a){'
    + 'var c=a.closest("aside,div");if(c){c.remove();}});}'
    + 'clean();'
    + 'new MutationObserver(clean).observe(document.documentElement,{childList:true,subtree:true});'
    + '})();<\/script>';
  if (/<\/body>/i.test(out)) out = out.replace(/<\/body>/i, OBS + '</body>');
  else out += OBS;
  function byteLen(s) {
    try { return new TextEncoder().encode(s).length; }
    catch (e) { return unescape(encodeURIComponent(s)).length; }
  }
  Object.keys(headers).forEach(function (k) {
    var lk = k.toLowerCase();
    if (lk === 'content-security-policy' || lk === 'content-security-policy-report-only'
      || lk === 'content-encoding' || lk === 'transfer-encoding' || lk === 'content-length') delete headers[k];
  });
  headers['Content-Length'] = String(byteLen(out));
  $done({ body: out, headers: headers });
})();
