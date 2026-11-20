// 中国联通 App 去广告
// 依据：2026-11-20 抓包确认（会话 2026-11-20-171151 与 2026-11-20-172245）
//   1) 商城弹窗：m.10010.com/mall-order/query/newFirstPage，返回 data 置空
//   2) 开屏广告：m.client.10010.com/clientIndex/api/v1/index/queryIndexCfig
//      返回 data.kaiPingShowFlag = '1'（开屏广告开启），改为 '0' 关掉
//      右上角签到图标：data.signImg / signedImg / signUrl，置空去掉
//      （右上角客服图标不在任何接口返回里，是 App 内置按钮，去不掉）
//      另一处签到图标：m.client.10010.com/mobileserviceNine/api/v1/index/queryCfig
//      返回 data.signImg / signedImg / signUrl，同样置空
//   3) 首页背景横幅（联通会员礼包）：m.client.10010.com/clientIndex/homefusion/fuInter
//      返回 HomeFusion.backGroundQuery.result（含 productName 会员礼包主题日），置空
//   4) 悬浮窗广告（通通）：同一接口 HomeFusion.fuchuangAdv_A8.advCntList，置空
//      （bottomLabel 是底部导航图标，不是广告，不动）
//   5) 服务提醒条：m.client.10010.com/clientIndex/v1/api/serviceReminder
//      返回 data.title（如“您有12个月vip会员可领取”），data 置 null 隐藏
//   6) 首页营销卡片（宽带新装/话费补贴/流量特惠/铂金会员专享等）：
//      m.client.10010.com/mobileserviceNine/api/v1/homeService/getServiceHomeMarketingBits
//      返回 hiddenTop/hiddenBottom（改为 true）与 topList/bottomList（内容轮换）。
//      实测：只改 hidden 开关不够，App 会忽略开关继续渲染列表；
//      须把 topList/bottomList 直接置空数组，才彻底没东西可画。
//      （2026-11-20 18:18 截图证实卡片仍在，且内容会轮换：17:38 是优选好货/
//      新装宽带/新装二宽，18:18 是宽带新装/话费补贴/升级起飞/流量特惠）
//   7) “推荐”页商品瀑布流：card.10010.com/mall-access/query/waterfallFlow
//      返回 data.res.pageList（手机/上网卡/配件商品），置空后推荐页不再刷商品。
//   8) 联通自有广告平台 smartad.10010.com（配置、上报），由模块规则直接 REJECT
//   9) m1.ad.10010.com 已在模块规则里 REJECT；开屏/首页广告接口
//      uniAdmsInterface/getWelcomeAd、getHomePageAd 也已在模块 URL Rewrite 里 REJECT
//  10) zztfly.com 是设备指纹校验 SDK（FLYVERIFY），不是广告，不动
//  11) 穿山甲广告 SDK（zijieapi.com / volces.com）是共享域名，不动
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

    // 2b) 另一处签到图标：mobileserviceNine queryCfig，data.signImg/signedImg/signUrl 置空
    if (url.indexOf('/mobileserviceNine/api/v1/index/queryCfig') !== -1) {
      if (data.data && typeof data.data === 'object') {
        let changed = false;
        for (const k of ['signImg', 'signedImg', 'signUrl']) {
          if (typeof data.data[k] === 'string' && data.data[k] !== '') {
            data.data[k] = '';
            changed = true;
          }
        }
        if (changed) {
          console.log('[联通去广告] 签到图标已去掉（queryCfig）');
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

    // 6) 首页营销卡片：hidden 开关置 true，topList/bottomList 直接清空
    if (url.indexOf('/mobileserviceNine/api/v1/homeService/getServiceHomeMarketingBits') !== -1) {
      if (data.data && typeof data.data === 'object') {
        let changed = false;
        if (data.data.hiddenTop === false) { data.data.hiddenTop = true; changed = true; }
        if (data.data.hiddenBottom === false) { data.data.hiddenBottom = true; changed = true; }
        if (Array.isArray(data.data.topList) && data.data.topList.length > 0) {
          data.data.topList = [];
          changed = true;
        }
        if (Array.isArray(data.data.bottomList) && data.data.bottomList.length > 0) {
          data.data.bottomList = [];
          changed = true;
        }
        if (changed) {
          console.log('[联通去广告] 首页营销卡片已清空');
          $done({ body: JSON.stringify(data) });
          return;
        }
      }
      $done({});
      return;
    }

    // 7) “推荐”页商品瀑布流：data.res.pageList 置空
    if (url.indexOf('/mall-access/query/waterfallFlow') !== -1) {
      if (data.data && data.data.res && Array.isArray(data.data.res.pageList) && data.data.res.pageList.length > 0) {
        data.data.res.pageList = [];
        console.log('[联通去广告] 推荐页商品瀑布流已清空');
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
