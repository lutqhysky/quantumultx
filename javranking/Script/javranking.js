/******************************
脚本功能：JavRanking 去除赞助广告位 (Spot A 顶部通栏 + Spot B 内容流大卡)
说明：1) 删除 <aside class="spot-a-wrapper"> 整块（含条形广告与认领 dialog），
        并去掉 <main> 上的 has-spot-top 布局补偿 class，避免顶部留白；
      2) 删除全部 <li class="sponsor-grid-slot">（Spot B 卡片，混在各榜单
        网格第一格，含其认领 dialog 与初始化 script）。
      相关初始化脚本均用 querySelectorAll 遍历，元素不存在自动跳过，不会报错。
*******************************/
let body = $response.body;
if (body) {
    body = body
        .replace(/<aside[^>]*class="spot-a-wrapper"[^>]*>[\s\S]*?<\/aside>/, '')
        .replace(/<li class="sponsor-grid-slot">[\s\S]*?<\/li>/g, '')
        .replace(' class="has-spot-top"', '');
    $done({ body });
} else {
    $done({});
}
