// 花小猪 App 去广告
// 依据：2026-11-20 抓包确认（会话 2026-11-20-192819）
//
// 首页由 pLayout 列组件、pData 下发数据；但打车区下方的横幅、
// 赏秋搭子、VIP 横幅等全部来自 casper-agent 的 feeds 卡片，
// 开屏与进首页弹窗来自 res-new 的 activity/mget：
//
//  1) pLayout：移除 banner_position_list、home_market_resource、
//     marketing_bubble 三个纯推广组件。
//  2) pData：金刚区 king_kong_position_list 12 项只留
//     顺风车/代驾/租车；new_marketing_bubble 的
//     p_home_page_upper_right 置空（右上浮动花花福利社图标）。
//  3) casper-agent /agent/v3/feeds：data.kf-pig-homev2.cards 置空
//     数组——去掉花花福利社超级横幅、赏秋搭子（88元券包/
//     网易云音乐/助力神券/全民助力）、V4 会员横幅、
//     p_advertisement_home_brand_minds 广告卡、底部其他横幅。
//     该 feeds 只含推广卡片，无打车功能组件。
//  4) res-new /resapi/activity/mget：data.p_startpage 置空
//     （开屏广告，staticImage）；data.p_home_popup 置空
//     （进首页全屏弹窗「送你免单券」）。
//
// 不动的：快车/顺风车切换、地图、上车位置、天气、Hi 问候卡、
// 顶部券入口、左侧注册司机入口、行程等功能组件。
// 安全：解析失败或结构异常时一律原样返回，不破坏页面。

(function main() {
  // 金刚区只留的功能项
  var KEEP_KINGKONG = ['顺风车', '代驾', '租车'];
  // 纯推广组件（从布局里移除）
  var REMOVE_COMPONENTS = ['banner_position_list', 'home_market_resource', 'marketing_bubble'];

  function kingkongName(item) {
    if (!item || typeof item !== 'object') return '';
    var keys = ['name', 'title', 'bubble_text'];
    for (var i = 0; i < keys.length; i++) {
      if (typeof item[keys[i]] === 'string' && item[keys[i]]) return item[keys[i]];
    }
    return '';
  }

  try {
    const url = $request.url || '';
    const body = $response.body;
    if (!body) { $done({}); return; }
    const data = JSON.parse(body);
    if (!data || typeof data !== 'object') { $done({}); return; }

    // 1) pLayout：移除纯推广组件
    if (url.indexOf('/gulfstream/passenger-center/v1/other/pLayout') !== -1) {
      let changed = false;
      if (data.data && Array.isArray(data.data.disorder_components)) {
        const before = data.data.disorder_components.length;
        data.data.disorder_components = data.data.disorder_components.filter(function (c) {
          return c && REMOVE_COMPONENTS.indexOf(c.name) === -1;
        });
        if (data.data.disorder_components.length !== before) changed = true;
      }
      if (data.data && data.data.page_conf && data.data.page_conf.data && Array.isArray(data.data.page_conf.data.lazy_load_components)) {
        const before = data.data.page_conf.data.lazy_load_components.length;
        data.data.page_conf.data.lazy_load_components = data.data.page_conf.data.lazy_load_components.filter(function (n) {
          return REMOVE_COMPONENTS.indexOf(n) === -1;
        });
        if (data.data.page_conf.data.lazy_load_components.length !== before) changed = true;
      }
      if (changed) {
        console.log('[花小猪] 布局已移除推广组件');
        $done({ body: JSON.stringify(data) });
        return;
      }
      $done({});
      return;
    }

    // 2) pData：过滤金刚区、清空营销气泡、移除推广组件
    if (url.indexOf('/gulfstream/passenger-center/v1/other/pData') !== -1) {
      if (data.data && Array.isArray(data.data.components)) {
        let changed = false;
        const before = data.data.components.length;
        data.data.components = data.data.components.filter(function (c) {
          return c && REMOVE_COMPONENTS.indexOf(c.name) === -1;
        });
        if (data.data.components.length !== before) changed = true;
        for (const comp of data.data.components) {
          if (!comp || !comp.data || typeof comp.data !== 'object') continue;
          if (comp.name === 'resource_position_list' && Array.isArray(comp.data.king_kong_position_list)) {
            const kBefore = comp.data.king_kong_position_list.length;
            comp.data.king_kong_position_list = comp.data.king_kong_position_list.filter(function (it) {
              return KEEP_KINGKONG.indexOf(kingkongName(it)) !== -1;
            });
            if (comp.data.king_kong_position_list.length !== kBefore) changed = true;
          }
          if (comp.name === 'new_marketing_bubble' && Array.isArray(comp.data.p_home_page_upper_right) && comp.data.p_home_page_upper_right.length > 0) {
            comp.data.p_home_page_upper_right = [];
            changed = true;
          }
        }
        if (changed) {
          console.log('[花小猪] 首页推广内容已清理');
          $done({ body: JSON.stringify(data) });
          return;
        }
      }
      $done({});
      return;
    }

    // 3) casper-agent feeds：首页推广卡片全部置空
    if (url.indexOf('/agent/v3/feeds') !== -1) {
      if (data.data && data.data['kf-pig-homev2'] && Array.isArray(data.data['kf-pig-homev2'].cards) && data.data['kf-pig-homev2'].cards.length > 0) {
        data.data['kf-pig-homev2'].cards = [];
        console.log('[花小猪] 首页推广卡片已清空');
        $done({ body: JSON.stringify(data) });
        return;
      }
      $done({});
      return;
    }

    // 4) res-new activity/mget：开屏与首页弹窗置空
    if (url.indexOf('/resapi/activity/mget') !== -1) {
      let changed = false;
      if (data.data && typeof data.data === 'object') {
        if (Array.isArray(data.data.p_startpage) && data.data.p_startpage.length > 0) {
          data.data.p_startpage = [];
          changed = true;
        }
        if (Array.isArray(data.data.p_home_popup) && data.data.p_home_popup.length > 0) {
          data.data.p_home_popup = [];
          changed = true;
        }
      }
      if (changed) {
        console.log('[花小猪] 开屏/弹窗已清空');
        $done({ body: JSON.stringify(data) });
        return;
      }
      $done({});
      return;
    }

    $done({});
  } catch (e) {
    // 任何异常都原样放行，不破坏页面
    console.log('[花小猪] 处理异常，原样返回：' + (e && e.message));
    $done({});
  }
})();
