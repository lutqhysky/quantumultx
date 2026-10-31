// JavVerse 去广告 v1.3.1（2026-10-31，干净版）
// 与 v1.2.0 逻辑完全一致；诊断版 v1.3.0 的左下角角标已去掉。
// 修复要点（v1.2.0 起）：只处理 HTML 文档；改完删 Content-Encoding /
// Transfer-Encoding，Content-Length 按新 body UTF-8 字节数重算；删 CSP。
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
