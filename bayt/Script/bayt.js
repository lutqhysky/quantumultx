// Bayt App 后端订阅/额度改写（Pro 解锁第二层）
// 依据：2026-11-23 抓包确认（会话 2026-11-23-235504，43 请求）
//
// 第一层是 RevenueCat：rc.baytfm.com 的 subscriber 响应由
// RevenueCatUnlock 脚本注入 pro 权益（产品 Bayt_1_Month，到期 2099）。
// 但 App 另从自家后端 pandawork.cn 查订阅状态与额度，后端只认自己库里的
// 记录（RevenueCat webhook 同步），客户端注入改不到它，所以这里再改一层：
//
// 1. /api/subscription/{userId}
//    原样：{"success":true,"data":{"userId":"...","status":"none","source":"none",
//            "userType":"free","plan":null,"cycleStartTime":...,"cycleEndTime":...,
//            "firstSeenTime":...}}
//    改后：status "none"->"active"，source "none"->"revenuecat"，
//          userType "free"->"pro"，plan null->"pro"（周期起止时间原样保留）。
//
// 2. /api/user-quota?userId=...&userType=free&cycleStartTime=...&cycleEndTime=...
//    原样：{"success":true,"userId":"...","userType":"free",...,
//            "quotaUsage":{"totalQuota":1,"usedQuota":0,"remainingQuota":1,
//            "userType":"free","freeUserLimit":1,"proUserLimit":30,
//            "proLimitSeconds":72000,...}}
//    改后：userType "free"->"pro"，quotaUsage.totalQuota 1->30（proUserLimit），
//          remainingQuota = 30 - usedQuota，quotaUsage.userType "free"->"pro"。
//    各档秒数上限（proLimitSeconds 等）原样保留。
//
// 注意：status/source/plan 的 Pro 取值是按常见命名推断的（未抓到过真实 Pro
// 后端响应），若 App 仍显示免费，须按实抓的 Pro 响应字段名再改。
// 安全：解析失败或结构异常时一律原样返回，不破坏页面。

(function main() {
  try {
    const url = $request.url || '';
    const body = $response.body;
    if (!body) { $done({}); return; }
    const obj = JSON.parse(body);
    if (!obj || typeof obj !== 'object') { $done({}); return; }

    // 订阅状态：改成 Pro
    if (url.indexOf('/api/subscription/') !== -1) {
      if (obj.data && typeof obj.data === 'object') {
        obj.data.userType = 'pro';
        obj.data.plan = 'pro';
        obj.data.status = 'active';
        obj.data.source = 'revenuecat';
        console.log('[Bayt] 订阅状态已改为 Pro');
        $done({ body: JSON.stringify(obj) });
        return;
      }
      $done({});
      return;
    }

    // 额度：改成 Pro 额度（30 次翻译/周期）
    if (url.indexOf('/api/user-quota') !== -1) {
      obj.userType = 'pro';
      if (obj.quotaUsage && typeof obj.quotaUsage === 'object') {
        const used = obj.quotaUsage.usedQuota || 0;
        obj.quotaUsage.userType = 'pro';
        obj.quotaUsage.totalQuota = 30;
        obj.quotaUsage.remainingQuota = Math.max(0, 30 - used);
        console.log('[Bayt] 额度已改为 Pro（30 次/周期）');
      }
      $done({ body: JSON.stringify(obj) });
      return;
    }

    $done({});
  } catch (e) {
    console.log('[Bayt] 处理异常，原样返回: ' + e.message);
    $done({});
  }
})();
