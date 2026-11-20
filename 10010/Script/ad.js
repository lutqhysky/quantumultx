// 中国联通 App 去广告
// 依据：2026-11-20 抓包确认（会话 2026-11-20-171151 与 2026-11-20-172245）
//   1) 商城弹窗：m.10010.com/mall-order/query/newFirstPage，返回 data 置空
//   2) 开屏广告：m.client.10010.com/clientIndex/api/v1/index/queryIndexCfig
//      返回 data.kaiPingShowFlag = '1'（开屏广告开启），改为 '0' 关掉
//      右上角签到图标：data.signImg / signedImg / signUrl，置空去掉
//      （右上角客服图标不在任何接口返回里，是 App 内置按钮，去不掉）
//   3) 首页背景横幅（联通会员礼包）：m.client.10010.com/clientIndex/homefusion/fuInter
//      返回 HomeFusion.backGroundQuery.result（含 productName 会员礼包主题日），置空
//   4) 悬浮窗广告（通通）：同一接口 HomeFusion.fuchuangAdv_A8.advCntList，置空
//      （bottomLabel 是底部导航图标，不是广告，不动）
//   5) 服务提醒条：m.client.10010.com/clientIndex/v1/api/serviceReminder
//      返回 data.title（如“您有12个月vip会员可领取”），data 置 null 隐藏
//   6) 首页营销卡片（合约购机/宽带新装/5G专区等）：
//      m.client.10010.com/mobileserviceNine/api/v1/homeService/getServiceHomeMarketingBits
//      返回 hiddenTop/hiddenBottom，改为 true 隐藏上下两组营销位
//   7) 联通自有广告平台 smartad.10010.com（配置、上报），由模块规则直接 REJECT
//   8) m1.ad.10010.com 已在模块规则里 REJECT；开屏/首页广告接口
//      uniAdmsInterface/getWelcomeAd、getHomePageAd 也已在模块 URL Rewrite 里 REJECT
//   9) zztfly.com 是设备指纹校验 SDK（FLYVERIFY），不是广告，不动
//  10) 穿山甲广告 SDK（zijieapi.com / volces.com）是共享域名，不动
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

    // 2) 开屏广告：kaiPingShowFlag 1 -> 0；右上角签到图标置空
    if (url.indexOf('/clientIndex/api/v1/index/queryIndexCfig') !== -1) {
      if (data.data && typeof data.data === 'object') {
        let changed = false;
        if (data.data.kaiPingShowFlag === '1') {
          data.data.kaiPingShowFlag = '0';
          changed = true;
          console.log('[联通去广告] 开屏广告开关已关：kaiPingShowFlag 1 -> 0');
        }
        for (const k of ['signImg', 'signedImg', 'signUrl']) {
          if (typeof data.data[k] === 'string' && data.data[k] !== '') {
            data.data[k] = '';
            changed = true;
          }
        }
        if (changed) {
          console.log('[联通去广告] 右上角签到图标已去掉');
          $done({ body: JSON.stringify(data) });
          return;
        }
      }
      $done({});
      return;
    }

    // 3) + 4) 首页背景横幅 + 悬浮窗广告
    if (url.indexOf('/clientIndex/homefusion/fuInter') !== -1) {
      let changed = false;
      const bg = data['HomeFusion.backGroundQuery'];
      if (bg && Array.isArray(bg.result) && bg.result.length > 0) {
        bg.result = [];
        changed = true;
        console.log('[联通去广告] 首页背景横幅已清空');
      }
      const fc = data['HomeFusion.fuchuangAdv_A8'];
      if (fc && Array.isArray(fc.advCntList) && fc.advCntList.length > 0) {
        fc.advCntList = [];
        changed = true;
        console.log('[联通去广告] 悬浮窗广告已清空');
      }
      if (changed) { $done({ body: JSON.stringify(data) }); return; }
      $done({});
      return;
    }

    // 5) 服务提醒条：data 置 null
    if (url.indexOf('/clientIndex/v1/api/serviceReminder') !== -1) {
      if (data.data && typeof data.data === 'object') {
        data.data = null;
        console.log('[联通去广告] 服务提醒条已隐藏');
        $done({ body: JSON.stringify(data) });
        return;
      }
      $done({});
      return;
    }

    // 6) 首页营销卡片：hiddenTop/hiddenBottom 置 true
    if (url.indexOf('/mobileserviceNine/api/v1/homeService/getServiceHomeMarketingBits') !== -1) {
      if (data.data && typeof data.data === 'object') {
        let changed = false;
        if (data.data.hiddenTop === false) { data.data.hiddenTop = true; changed = true; }
        if (data.data.hiddenBottom === false) { data.data.hiddenBottom = true; changed = true; }
        if (changed) {
          console.log('[联通去广告] 首页营销卡片已隐藏');
          $done({ body: JSON.stringify(data) });
          return;
        }
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
