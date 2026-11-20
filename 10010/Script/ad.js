// 中国联通 App 去广告
// 依据：2026-11-20 抓包确认
//   1) 商城弹窗：m.10010.com/mall-order/query/newFirstPage，返回 data 置空
//   2) 开屏广告：m.client.10010.com/clientIndex/api/v1/index/queryIndexCfig
//      返回 data.kaiPingShowFlag = '1'（开屏广告开启），改为 '0' 关掉
//   3) 联通自有广告平台 smartad.10010.com（配置、上报），由模块规则直接 REJECT
//   4) m1.ad.10010.com 已在模块规则里 REJECT；开屏/首页广告接口
//      uniAdmsInterface/getWelcomeAd、getHomePageAd 也已在模块 URL Rewrite 里 REJECT
//   5) zztfly.com 是设备指纹校验 SDK（FLYVERIFY），不是广告，不动
//   6) 穿山甲广告 SDK（zijieapi.com / volces.com）是共享域名，不动
// 安全：解析失败或结构异常时一律原样返回，不破坏页面。

(function main() {
  try {
    const url = $request.url || '';
    const body = $response.body;
    if (!body) { $done({}); return; }
    const data = JSON.parse(body);
    if (!data || typeof data !== 'object') { $done({}); return; }

    // 1) 商城弹窗：data 置空
    if (url.indexOf('/mall-order/query/newFirstPage') !== -1) {
      data.data = {};
      $done({ body: JSON.stringify(data) });
      return;
    }

    // 2) 开屏广告：kaiPingShowFlag 1 -> 0
    if (url.indexOf('/clientIndex/api/v1/index/queryIndexCfig') !== -1) {
      if (data.data && typeof data.data === 'object' && data.data.kaiPingShowFlag === '1') {
        data.data.kaiPingShowFlag = '0';
        console.log('[联通去广告] 开屏广告开关已关：kaiPingShowFlag 1 -> 0');
        $done({ body: JSON.stringify(data) });
        return;
      }
      $done({});
      return;
    }

    $done({});
  } catch (e) {
    // 任何异常都原样放行，不破坏页面
    console.log('[联通去广告] 处理异常，原样返回：' + (e && e.message));
    $done({});
  }
})();
