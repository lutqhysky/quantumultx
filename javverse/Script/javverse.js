// JavVerse 去广告 v1.0.0（2026-10-31）
// 目标：去掉页面里的广告位（AD 标签 + 广告链接 + × 关闭按钮的容器）。
// 依据：浏览器实测——广告位为 complementary landmark、可访问名称 Advertisement，
//       推测为 <aside aria-label="Advertisement">；由站点 JS 随滚动动态生成，
//       若容器不在初始 HTML 里则本脚本无匹配、原样透传，需实机验证。
// 范围：只删广告位，不动 Telegram 频道胶囊（aria-label="Telegram 频道"，如需去掉可再加一行）。
(function () {
  var body = $response.body || '';
  var pats = [
    /<aside[^>]*aria-label=(["'])Advertisement\1[^>]*>[\s\S]*?<\/aside>/gi,
    /<div[^>]*aria-label=(["'])Advertisement\1[^>]*>[\s\S]*?<\/div>/gi
  ];
  var out = body;
  for (var i = 0; i < pats.length; i++) out = out.replace(pats[i], '');
  $done({ body: out });
})();
