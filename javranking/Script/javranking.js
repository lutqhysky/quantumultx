/******************************
脚本功能：JavRanking 去除赞助广告位 (Spot A 顶部通栏 + Spot B 内容流大卡 + Spot C 详情页外投卡)
说明：1) 删除 Spot A：<aside class="spot-a-wrapper"> 整块（含条形广告与认领
        dialog），并去掉 <main> 上的 has-spot-top 布局补偿 class，防顶部留白；
      2) 删除 Spot B：全部 class 含 sponsor-grid-slot 的 <li>（混在各页面
        网格首位，含其认领 dialog 与初始化 script）。该 li 形态因页面而异
        （首页无额外属性，explore 带 data-explore-sponsor，榜单页带
        data-page，女优页 class 前还有 awarded-actor-grid__item），
        正则只认 class 列表中含 sponsor-grid-slot，不做整标签精确匹配；
      3) 删除 Spot C：<aside class="... spot-c-slot" data-spot-c> 整块
        （影片详情页的外投广告卡，如 AI 风月）。
      相关初始化脚本均用 querySelectorAll 遍历，元素不存在自动跳过，不会报错。
*******************************/
let body = $response.body;
if (body) {
    body = body
        .replace(/<aside[^>]*class="spot-a-wrapper"[^>]*>[\s\S]*?<\/aside>/, '')
        .replace(/<li[^>]*class="[^"]*sponsor-grid-slot[^"]*"[^>]*>[\s\S]*?<\/li>/g, '')
        .replace(/<aside[^>]*class="[^"]*spot-c-slot[^"]*"[^>]*>[\s\S]*?<\/aside>/g, '')
        .replace(' class="has-spot-top"', '');
    $done({ body });
} else {
    $done({});
}
