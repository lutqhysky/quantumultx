/******************************
脚本功能：JavRanking 去除顶部赞助通栏 (Spot A · 全站首屏黄金通栏)
说明：删除 <aside class="spot-a-wrapper"> 整块（含条形广告与认领 dialog），
      并去掉 <main> 上的 has-spot-top 布局补偿 class，避免顶部留白。
      其后的初始化脚本用 querySelectorAll 遍历，元素不存在自动跳过，不会报错。
*******************************/
let body = $response.body;
if (body) {
    body = body
        .replace(/<aside[^>]*class="spot-a-wrapper"[^>]*>[\s\S]*?<\/aside>/, '')
        .replace(' class="has-spot-top"', '');
    $done({ body });
} else {
    $done({});
}
