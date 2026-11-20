// 花小猪 App 去广告
// 依据：2026-11-20 抓包确认（会话 2026-11-20-192819）
//
// 首页由 pLayout 列出 21 个组件、pData 分批下发各组件数据：
//   1) 金刚区推广：resource_position_list 的 king_kong_position_list
//      共 12 项，只留功能项顺风车/代驾/租车，去掉 9 项推广
//      （助力神券、赚现金、花花会员、省钱套餐、花花学生卡、
//      得免单券、借钱、省钱中心、88元券包；各项 is_ad 均为 0，
//      只能按名字过滤）。
//   2) 右上浮动图标（花花福利社）：new_marketing_bubble 的
//      p_home_page_upper_right 置空数组。
//   3) 底部横幅与营销资源：banner_position_list、home_market_resource、
//      marketing_bubble 三个纯推广组件——pData 里未下发其数据，
//      改为从 pLayout 的 disorder_components 与 lazy_load_components
//      里直接移除，App 不再渲染；pData 里若出现也一并移除。
// 不动的：快车/顺风车切换、地图、上车位置、天气、Hi 问候卡、
// 顶部券入口、左侧注册司机入口、行程中等功能组件。
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
        // 移除纯推广组件
        const before = data.data.components.length;
        data.data.components = data.data.components.filter(function (c) {
          return c && REMOVE_COMPONENTS.indexOf(c.name) === -1;
        });
        if (data.data.components.length !== before) changed = true;
        for (const comp of data.data.components) {
          if (!comp || !comp.data || typeof comp.data !== 'object') continue;
          // 金刚区只留功能项
          if (comp.name === 'resource_position_list' && Array.isArray(comp.data.king_kong_position_list)) {
            const kBefore = comp.data.king_kong_position_list.length;
            comp.data.king_kong_position_list = comp.data.king_kong_position_list.filter(function (it) {
              return KEEP_KINGKONG.indexOf(kingkongName(it)) !== -1;
            });
            if (comp.data.king_kong_position_list.length !== kBefore) changed = true;
          }
          // 营销气泡置空
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

    $done({});
  } catch (e) {
    // 任何异常都原样放行，不破坏页面
    console.log('[花小猪] 处理异常，原样返回：' + (e && e.message));
    $done({});
  }
})();
