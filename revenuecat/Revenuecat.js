/*************************************
项目名称：RevenueCat 全能解锁 (2026 工业级重构版 · 修复版)
修复记录（2026-09-29）：
1. AdGuard%20Home → AdGuard Home：UA 头里是空格不是 %20，原规则永
   远匹配不上，现已修复
2. 通知只在精确命中 MappingRules 时发送；盲猜路径只打日志，不再
   误报"已注入永久凭证"
3. 所有 $done 后补 return，避免跨引擎（QX/Loon/Stash）double-$done
4. 拆分 entitlement / subscription 两套模板：entitlement 不再混入
   will_renew、period_type 等订阅专属字段
5. 规则表新增 type 字段：lifetime 只写 non_subscriptions，subscription
   只写 subscriptions；同一 product 不再两边同时写
6. 'Law' 改为词边界严格匹配，避免 Flawless、LawnCare 等误命中
7. 到期时间改用 UTC 常量 '2098-12-31T23:59:59Z'，与通知文案一致；
   删除"2099 溢出"错误注释（JS Date 上限是 275760 年）
8. 请求阶段只删真实存在的条件缓存头（if-none-match/if-modified-since）；
   ETag 是响应头、x-revenuecat-* 不是请求头，原删除逻辑等价于空操作，
   已移除；同时移除发给服务器的无用 Cache-Control/Pragma
9. 移除 original_application_version 硬编码补全，避免干扰 App 版本判断
10. 终身凭证的 entitlement.expires_date 改为 null（RevenueCat 官方规范：
    终身无到期时间，不能写远期时间）；"统一延期"阶段保留终身为 null，
    只延期订阅型，避免把刚注入的 lifetime 又改回远期时间
11. 已知客观限制：RevenueCat Trusted Entitlements（响应签名校验，
    EntitlementVerificationMode）在 ENFORCED 模式下改 body 会失效；
    该功能默认关闭，INFORMATIONAL 模式只上报不拦截
**************************************/

const $ = new Env("RevenueCat_Pro");
const NOTIFY_INTERVAL_HOURS = 12;
// 到期时间用 UTC 常量，与通知文案"有效期至：2098-12-31"一致
const FAKE_EXPIRES = '2098-12-31T23:59:59Z';

// 精准排除项（全小写匹配）
const EXCLUDE_BUNDLE_IDS = [
    'com.crossutility.servercat',
    'com.kr328.clash',
    'zone.yiguo.flutter-rss-reader'
];
const EXCLUDE_UA_PREFIXES = [
    'lilyfm', 'servercat', 'eplayerx', 'authenticator',
    'reflix', 'fileball', 'aptv', 'forward', 'flutter_rss_reader'
];

// 盲猜用的通用 entitlement 名
const GUESS_NAMES = [
    'pro', 'premium', 'plus', 'vip', 'all', 'gold',
    'membership', 'advanced', 'lifetime', 'ultimate', 'super'
];

(function main() {
    // ---------- 1. 请求阶段：破除 304 缓存 ----------
    if (typeof $response === "undefined") {
        const headers = $request.headers || {};
        // 只删真实存在的客户端条件缓存头。
        // 注意：ETag 是响应头，客户端请求里不会有；x-revenuecat-etag /
        // x-revenuecat-last-receive-time 也不是标准请求头，删了等于没删。
        for (const k of Object.keys(headers)) {
            const lk = k.toLowerCase();
            if (lk === 'if-none-match' || lk === 'if-modified-since') {
                delete headers[k];
            }
        }
        $done({ headers: headers });
        return;
    }

    // ---------- 2. 响应阶段：动态构建与安全注入 ----------
    const reqHeaders = ($request && $request.headers) ? $request.headers : {};
    let rawUA = "";
    let BID = "";

    for (const [k, v] of Object.entries(reqHeaders)) {
        const lowerKey = k.toLowerCase();
        if (lowerKey === 'user-agent') rawUA = v;
        if (lowerKey === 'x-client-bundle-id') BID = v;
    }

    const lowerUA = rawUA.toLowerCase();
    const lowerBID = BID.toLowerCase();

    // 黑名单：bundle 精确匹配；UA 按前缀或 "/xxx" 片段匹配
    const isExcluded = EXCLUDE_BUNDLE_IDS.includes(lowerBID) ||
        EXCLUDE_UA_PREFIXES.some(prefix => lowerUA.startsWith(prefix) || lowerUA.includes('/' + prefix));

    if (isExcluded) {
        console.log(`[RC] 命中排除名单，放行: BID=${BID}, UA=${rawUA}`);
        $done({});
        return;
    }

    let obj = null;
    try {
        obj = JSON.parse($response.body);
    } catch (e) {
        console.log(`[RC] JSON 解析失败，保持原始返回: ${e.message}`);
        $done({});
        return;
    }

    if (!obj || !obj.subscriber) {
        console.log("[RC] 响应体中无 subscriber 对象，跳过修改");
        $done({});
        return;
    }

    const sub = obj.subscriber;
    const now = new Date();
    const formatDate = (d) => d.toISOString().replace(/\.\d{3}Z/, 'Z');
    const nowStr = formatDate(now);
    const origStr = formatDate(new Date(now.getTime() - 3 * 365 * 24 * 3600 * 1000));

    // 三套模板分开：entitlement 只含 entitlement 字段。
    // 注意：终身凭证的 expires_date 必须为 null（RevenueCat 官方规范），
    // 不能写远期时间——部分 App 用 expirationDate == nil 判断是否为终身。
    const baseEntitlementLifetime = {
        "grace_period_expires_date": null,
        "purchase_date": nowStr,
        "expires_date": null
    };
    const baseEntitlementSub = {
        "grace_period_expires_date": null,
        "purchase_date": nowStr,
        "expires_date": FAKE_EXPIRES
    };
    const baseSubscription = {
        "expires_date": FAKE_EXPIRES,
        "original_purchase_date": origStr,
        "purchase_date": nowStr,
        "ownership_type": "PURCHASED",
        "store": "app_store",
        "is_sandbox": false,
        "will_renew": true,
        "period_type": "normal",
        "billing_issues_detected_at": null,
        "grace_period_expires_date": null,
        "unsubscribe_detected_at": null
    };

    // 基础结构补全（不硬编码 original_application_version，避免干扰版本判断）
    sub.subscriptions = sub.subscriptions || {};
    sub.entitlements = sub.entitlements || {};
    sub.non_subscriptions = sub.non_subscriptions || {};
    sub.original_purchase_date = sub.original_purchase_date || origStr;
    sub.first_seen = sub.first_seen || origStr;
    sub.management_url = sub.management_url || "https://apps.apple.com/account/subscriptions";

    // 精准映射（数组保序；type 决定写 subscriptions 还是 non_subscriptions）
    const MappingRules = [
        { match: 'Sofa',         name: 'super',                                              id: 'sofa_family_29999_onetime',                 type: 'lifetime',     strict: false },
        { match: 'Welltory',     name: 'pro',                                                id: 'com.welltory.subscription.annual',          type: 'subscription', strict: false },
        { match: 'CineDock',     name: 'CineDock Pro',                                       id: 'cn.ixiaoxiang.video.lifetime',             type: 'lifetime',     strict: false },
        { match: 'FilmNoir',     name: 'plus',                                               id: 'app.filmnoir.appstore.purchases.lifetime', type: 'lifetime',     strict: false },
        { match: 'Photomator',   name: 'pixelmator_photo_pro_access',                         id: 'pixelmator_photo_pro_subscription_v1_pro_offer', type: 'subscription', strict: false },
        { match: 'WaterMinder',  name: 'waterminder-pro',                                    id: 'waterminder.premiumYearly',                type: 'subscription', strict: false },
        { match: 'Endel',        name: 'pro',                                                id: 'Lifetime',                                  type: 'lifetime',     strict: false },
        { match: 'Gentler',      name: 'premium',                                            id: 'app.gentler.activity.nonconsumable.onetime1', type: 'lifetime',   strict: false },
        { match: 'Law',          name: 'vip',                                                id: 'LawVIPOneYear',                             type: 'subscription', strict: true  },
        { match: 'Darkroom',     name: 'co.bergen.Darkroom.entitlement.allToolsAndFilters',  id: 'darkroom_gold_lifetime',                     type: 'lifetime',     strict: false },
        { match: 'AdGuard Home', name: 'aghrpro',                                            id: 'adguard.home.remote.pro',                   type: 'lifetime',     strict: false },
        { match: 'Pillow',       name: 'premium',                                            id: 'com.neybox.pillow.premium.year',           type: 'subscription', strict: false },
        { match: 'MoneyThings',  name: 'Premium',                                            id: 'com.lishaohui.cashflow.lifetime',          type: 'lifetime',     strict: false },
        { match: 'Anybox',       name: 'pro',                                                id: 'cc.anybox.Anybox.annual',                   type: 'subscription', strict: false },
        { match: 'ShellBean',    name: 'pro',                                                id: 'com.ningle.shellbean.iap.forever',         type: 'lifetime',     strict: false },
        { match: 'iplayTV',      name: 'com.ll.btplayer.12',                                 id: 'com.ll.btplayer.12',                         type: 'lifetime',     strict: false },
        { match: 'MOZE',         name: 'premium',                                            id: 'moze_pro_yearly',                            type: 'subscription', strict: false },
        { match: 'Vision',       name: 'pro',                                                id: 'com.vision.yearly_pro',                     type: 'subscription', strict: false },
        { match: 'Craft',        name: 'pro',                                                id: 'com.lukilabs.craft.pro.annual',             type: 'subscription', strict: false },
        { match: 'Structured',   name: 'pro',                                                id: 'today.structured.pro',                      type: 'subscription', strict: false },
        { match: 'Figma',        name: 'pro',                                                id: 'com.figma.ios.pro',                         type: 'subscription', strict: false },
        { match: 'Slopes',       name: 'pass',                                               id: 'com.breakthrough.slopes.annual_pass',      type: 'subscription', strict: false }
    ];

    // 正则元字符转义；strict 模式加词边界，避免 'Law' 误杀 'Flawless'
    const safeTest = (pattern, text, strict) => {
        if (!text) return false;
        const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const src = strict ? `\\b${escaped}\\b` : escaped;
        return new RegExp(src, 'i').test(text);
    };

    let rule = null;
    for (const r of MappingRules) {
        if (safeTest(r.match, lowerUA, r.strict) || safeTest(r.match, lowerBID, r.strict)) {
            rule = r;
            break;
        }
    }

    const injectSubscription = (productId, entNames) => {
        sub.subscriptions[productId] = {
            ...(sub.subscriptions[productId] || {}),
            ...baseSubscription
        };
        for (const n of entNames) {
            sub.entitlements[n] = {
                ...(sub.entitlements[n] || {}),
                ...baseEntitlementSub,
                "product_identifier": productId
            };
        }
    };

    const injectLifetime = (productId, entNames) => {
        for (const n of entNames) {
            sub.entitlements[n] = {
                ...(sub.entitlements[n] || {}),
                ...baseEntitlementLifetime,
                "product_identifier": productId
            };
        }
        const list = sub.non_subscriptions[productId] || [];
        // 去重：同一 product 只保留一条注入记录
        if (!list.some(e => e && e.id === productId)) {
            list.push({
                "id": productId,
                "is_sandbox": false,
                "purchase_date": nowStr,
                "original_purchase_date": origStr,
                "store": "app_store"
            });
        }
        sub.non_subscriptions[productId] = list;
    };

    let matchedAppKey, targetId;
    if (rule) {
        // 精确命中：按 type 只写一边
        matchedAppKey = rule.match;
        targetId = rule.id;
        if (rule.type === 'lifetime') injectLifetime(rule.id, [rule.name]);
        else injectSubscription(rule.id, [rule.name]);
    } else {
        // 盲猜：只走订阅型注入，不写 non_subscriptions，避免同一 product 两边写
        matchedAppKey = BID ? BID.split('.').pop() : ((rawUA.split('/')[0] || "App").split(' ')[0]);
        targetId = BID ? `${BID}.subscription` : `com.${matchedAppKey.toLowerCase()}.subscription`;
        injectSubscription(targetId, GUESS_NAMES);
    }

    // 统一延期现存 entitlement / subscription（保留原有 product_identifier 与 store 等属性）。
    // 终身（expires_date 为 null，含刚注入的 lifetime 与用户真实买断）保持 null，
    // 只把订阅型的延期到远期——否则上一步注入的 lifetime 会在这里被改回远期时间。
    for (const name of Object.keys(sub.entitlements)) {
        const cur = sub.entitlements[name] || {};
        const isLifetime = cur.expires_date === null || cur.expires_date === undefined;
        sub.entitlements[name] = {
            ...(isLifetime ? baseEntitlementLifetime : baseEntitlementSub),
            ...cur,
            "expires_date": isLifetime ? null : FAKE_EXPIRES,
            "product_identifier": cur.product_identifier || targetId
        };
    }
    for (const pid of Object.keys(sub.subscriptions)) {
        const cur = sub.subscriptions[pid] || {};
        sub.subscriptions[pid] = {
            ...baseSubscription,
            ...cur,
            "expires_date": FAKE_EXPIRES
        };
    }

    // 通知节流：只在精确命中时发送，盲猜不再误报
    if (rule) {
        const cleanKey = rule.match.replace(/[^a-zA-Z0-9_-]/g, '_');
        const storageKey = `rc_notify_${cleanKey}`;
        const lastNotify = $.getdata(storageKey) || 0;
        if ((Date.now() - parseInt(lastNotify, 10)) / 36e5 >= NOTIFY_INTERVAL_HOURS) {
            $.notify(`🎉 ${rule.match} 授权更新`, `已安全注入${rule.type === 'lifetime' ? '终身' : '永久'}凭证`, rule.type === 'lifetime' ? `终身有效` : `有效期至：2098-12-31`);
            $.setdata(Date.now().toString(), storageKey);
        }
    }

    console.log(`[RC] 注入完成: ${matchedAppKey} (${targetId})${rule ? ` [精确/${rule.type}]` : ' [盲猜]'}`);
    $done({ body: JSON.stringify(obj) });
    return;
})();

// Surge / QX / Loon / Stash 跨环境存储与通知兼容类（函数声明提升，底部定义亦可）
function Env(name) {
    this.name = name;
    this.notify = (title, sub, msg) => {
        if (typeof $notification !== "undefined") $notification.post(title, sub, msg);
        else if (typeof $notify !== "undefined") $notify(title, sub, msg);
    };
    this.getdata = (key) => {
        try {
            if (typeof $persistentStore !== "undefined") return $persistentStore.read(key);
            if (typeof $prefs !== "undefined") return $prefs.valueForKey(key);
        } catch (e) {
            console.log(`[RC] 读取存储失败: ${e.message}`);
        }
        return null;
    };
    this.setdata = (val, key) => {
        try {
            if (typeof $persistentStore !== "undefined") return $persistentStore.write(val, key);
            if (typeof $prefs !== "undefined") return $prefs.setValueForKey(val, key);
        } catch (e) {
            console.log(`[RC] 写入存储失败: ${e.message}`);
        }
        return false;
    };
}
