/******************************
脚本功能：JavRanking 去除赞助广告位 (Spot A 顶部通栏 + Spot B 内容流大卡)
说明：1) 删除 <aside class="spot-a-wrapper"> 整块（含条形广告与认领 dialog），
        并去掉 <main> 上的 has-spot-top 布局补偿 class，避免顶部留白；
      2) 删除全部 class 含 sponsor-grid-slot 的 <li>（Spot B 卡片，混在各
        页面网格首位，含其认领 dialog 与初始化 script）。
        注意：该 li 的形态因页面而异——首页无额外属性，explore 页带
        data-explore-sponsor 等，榜单页带 data-page，女优页 class 前还有
        awarded-actor-grid__item。正则须只认 class 列表中含
        sponsor-grid-slot，不能按整标签或 class 首位精确匹配。
      相关初始化脚本均用 querySelectorAll 遍历，元素不存在自动跳过，不会报错。
*******************************/
let body = $response.body;
if (body) {
    body = body
        .replace(/<aside[^>]*class="spot-a-wrapper"[^>]*>[\s\S]*?<\/aside>/, '')
        .replace(/<li[^>]*class="[^"]*sponsor-grid-slot[^"]*"[^>]*>[\s\S]*?<\/li>/g, '')
        .replace(' class="has-spot-top"', '');
    $done({ body });
} else {
    $done({});
}
