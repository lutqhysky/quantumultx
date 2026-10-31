// JavVerse 去广告 v1.1.0（2026-10-31）
// v1 教训：广告位由站点 JS 随滚动动态生成，不在初始 HTML 里，纯删静态标记会透传失效。
// v2 两手抓：
//   1) 响应体里先删已有的 aria-label="Advertisement" 容器（静态兜底）；
//   2) 在 </body> 前注入一段盯梢脚本（MutationObserver），广告容器一旦出现在 DOM 里就删，
//      命中条件：aria-label 含 advertisement（不区分大小写），或含已知广告域链接的容器。
//   3) 顺带去掉 CSP 响应头，避免内联盯梢脚本被站点 CSP 拦截。
// 范围：只删广告位，不动 Telegram 频道胶囊。
(function () {
  var body = $response.body || '';
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
  var headers = $response.headers || {};
  Object.keys(headers).forEach(function (k) {
    var lk = k.toLowerCase();
    if (lk === 'content-security-policy' || lk === 'content-security-policy-report-only') delete headers[k];
  });
  $done({ body: out, headers: headers });
})();
