// 简讯 App 解锁（VIP + 语音）
// 依据：2026-11-20 抓包确认（会话 2026-11-20-185915）
//
// 现状：
//   1) /api/v1/user/info 与 /api/v1/login/account 返回 data.is_vip、
//      vip_expire_time、is_broadcast。原脚本已把 is_vip 置 true、
//      vip_expire_time 置 2099-12-12、is_broadcast 置 1，文章可读。
//      （实测 user/info 已返回 is_vip:true、vip_expire_time:"2099-12-12"）
//   2) 语音分两处：
//      a) 文章自带 voice 字段（有录音的文章才有，如“空城计博弈”
//         voice 为 img.tipsoon.com/aac/*.aac；16 篇里仅 1 篇有，
//         其余文章本身无录音，脚本造不出语音）。
//      b) 语音栏目“星河”（type 3，“用语音的方式讲述自己的故事，
//         每晚更新”）与 FM（/api/v1/info/fm）。栏目列表
//         /api/v1/top/column 返回每栏 user_stauts:false，疑似未解锁；
//         /api/v1/info/fm 返回仅 {"code":1} 无数据。
//   3) 系统配置 /api/v1/top/system：open_fm_switch=1，
//      vip_desc_txt 称 VIP“已解锁语音版”。
//
// 本脚本：
//   1) user/info、login/account：is_vip=true、vip_expire_time=2099-12-12、
//      is_broadcast=1（沿用原脚本）。
//   2) top/column：全部栏目的 user_stauts 置 true，解锁语音栏目“星河”。
// 安全：解析失败或结构异常时一律原样返回，不破坏页面。

(function main() {
  try {
    const url = $request.url || '';
    const body = $response.body;
    if (!body) { $done({}); return; }
    const data = JSON.parse(body);
    if (!data || typeof data !== 'object') { $done({}); return; }

    // 1) 用户信息 / 登录：VIP 解锁（沿用原脚本）
    if (url.indexOf('/api/v1/user/info') !== -1 || url.indexOf('/api/v1/login/account') !== -1) {
      if (data.data && typeof data.data === 'object') {
        data.data.is_vip = true;
        data.data.vip_expire_time = '2099-12-12 00:00:00';
        data.data.is_broadcast = 1;
        console.log('[简讯] VIP 已解锁');
        $done({ body: JSON.stringify(data) });
        return;
      }
      $done({});
      return;
    }

    // 2) 栏目列表：user_stauts 置 true，解锁语音栏目“星河”等
    if (url.indexOf('/api/v1/top/column') !== -1) {
      if (data.data && Array.isArray(data.data.items)) {
        let changed = false;
        for (const item of data.data.items) {
          if (item && item.user_stauts !== true) {
            item.user_stauts = true;
            changed = true;
          }
        }
        if (changed) {
          console.log('[简讯] 栏目已解锁（含语音栏目星河）');
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
    console.log('[简讯] 处理异常，原样返回：' + (e && e.message));
    $done({});
  }
})();
