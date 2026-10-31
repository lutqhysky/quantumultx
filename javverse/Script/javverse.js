// JavVerse 去广告 v1.3.0-diag（2026-10-31，临时诊断版）
// 与 v1.2.0 逻辑完全一致，只多一处：注入的盯梢脚本会在页面左下角贴一个
// 10px 小角标 "jv1.3.0"，用于直接确认手机上跑的是不是最新版。
// 确认后立即推干净版（去掉角标），本版不长期保留。
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
    + 'try{var b=document.createElement("div");b.textContent="jv1.3.0";'
    + 'b.style.cssText="position:fixed;left:8px;bottom:8px;z-index:2147483647;font-size:10px;color:#fff;background:rgba(0,0,0,.5);padding:2px 6px;border-radius:4px;pointer-events:none;";'
    + 'document.body.appendChild(b);}catch(e){}'
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
