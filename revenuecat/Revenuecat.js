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
7. 到期时间改用 UTC 常量 '2099-12-31T23:59:59Z'，与通知文案一致；
   删除"2099 溢出"错误注释（JS Date 上限是 275760 年）
8. 请求阶段删除条件缓存头（if-none-match/if-modified-since/x-revenuecat-etag），
   强制服务器回 200 全量响应，避免 304 无 body 导致脚本无从修改；
   【纠正】此前曾误删 x-revenuecat-etag 处理，抓包证实 RevenueCat SDK 确实
   在请求中携带该头做条件请求，已恢复删除；
   同时移除发给服务器的无用 Cache-Control/Pragma
9. 移除 original_application_version 硬编码补全，避免干扰 App 版本判断
10. 终身凭证的 entitlement.expires_date 改为 null（RevenueCat 官方规范：
    终身无到期时间，不能写远期时间）；"统一延期"阶段保留终身为 null，
    只延期订阅型，避免把刚注入的 lifetime 又改回远期时间
11. 已知客观限制：RevenueCat Trusted Entitlements（响应签名校验，
    EntitlementVerificationMode）在 ENFORCED 模式下改 body 会失效；
    该功能默认关闭，INFORMATIONAL 模式只上报不拦截
12. 通知决策加调试日志：发送/节流跳过都会打日志，方便排查"没通知"问题
13. 通知节流 key 命名空间升级为 rc_notify_v2_，与旧版脚本的节流记录隔离
14. 非订阅响应诊断：记录顶层 keys；offerings 响应额外抓取真实 platform_product_identifier，
    用于给未知 App 补充精确规则（只记 key 名，不记 token）
15. 规则支持 names 数组（候选 entitlement 集）；新增 The Outsiders 精确规则，
    product 用真实响应核实的 app.outsiders.subscription.EB.yearly（年订阅），entitlement 用候选集
16. 到期时间常量改为 2099-12-31T23:59:59Z（用户要求）
17. 请求阶段恢复删除 x-revenuecat-etag（纠正第一轮审查的误判：抓包证实
    RevenueCat SDK 确实在请求中携带该头做条件请求；不删会命中 304 无 body）
18. offerings 诊断增加包映射输出（$rc_annual/$rc_lifetime 等包标识 -> product id，
    判断订阅/买断的铁证）；盲猜日志的 App 名过滤纯顶级域名
    （thirteendoots.kelo.com 不再显示为 com）；新增 Kelo 精确规则
19. 新增谜底时钟精确规则：真实 product tech.miidii.MDClock.subscription.year.v1、
    真实 entitlement 名 Entitlement.Pro 均从服务器响应核实，不再用候选集
    （2026-10-14 移除，见 25）
20. 盲猜增强：GUESS_NAMES 从 11 扩到 24 个常用名；新增 buildGuessNames(BID)，
    从 BID 有意义片段派生 "<token>.pro/premium/vip/plus/gold/membership"
    （如 datacalc.pro），去重后注入——DataCalc 这类命名现在可被盲猜命中
21. 新增成语日历精确规则：entitlement 名 calendar、product id
    com.fiachra.DailyIdiomApp.yearly，均已核实（2026-10-14 用户提供）
22. 新增 Snipd 精确规则：entitlement premium、product
    snipd_premium_1y_7199_trial_2w_v2（年订 71.99/2周试用），数据取自上游
    Reheji.js，尚未用 offerings/真实响应核实，待用户实机验证
23. 盲猜数据驱动升级（422 条真实映射词频统计）：
    GUESS_NAMES 24 → 40，新增 Pro/Premium/VIP/Plus 大小写变体（合计 65 条样本）
    及 Pro access/patron/Entitlement.Pro/allaccess 等高频真实名；
    GUESS_SUFFIXES 新增 lifetime/yearly/annual/forever（真实 entitlement 尾段高频）；
    BID_NOISE 新增 me、www（bundle-id 纯前缀噪声）
24. 盲猜派生模式补全：新增 "<token>_<suffix>"（umai_pro 类）与
    "<全BID>.<suffix>" / "<全BID>_<suffix>"（io.fadel.teleprompterx.pro、
    com.minardwu.cocam_lifetime 类）；bundle 样本完整盲猜命中率 69.4% → 77.8%
25. 移除谜底时钟精确规则（2026-10-14 用户确认）：注入每次成功但 App 始终显示
    真实试用期时间、会员功能未解锁，判定其门控不走 RevenueCat subscriber 响应
    （疑似 StoreKit 2 本地交易验证，网络层脚本无法伪造），留着只会误报
26. 外部审查整改（2026-10-15，用户上传 Revenuecat_js.md 审查报告并逐条核实后执行）：
    P0 统一延期两处循环展开顺序反转——模板后置、真实值前置，will_renew/is_sandbox/
    unsubscribe_detected_at 等"已失效信号"被刷成正常订阅状态，只保留真实购买
    时间与 product_identifier；Vision/Craft/Sofa/Pillow 四条高风险规则加 strict
    词边界（防 nightvision/visionos/pocketcraft/sleeppillow 类子串误伤）；
    injectSubscription/injectLifetime 保留真实 purchase_date（报告 5.1，补丁只动
    统一延期不够，必须动注入函数）；排除名单 UA 前缀加词边界，'forward' 不再
    误伤 ForwardMail（报告 5.2）。未采纳：盲猜瘦身（命中率 77.8% 优先于十几 KB
    体积）；修复记录第 11 条表述（官方文档证实默认不拦截，实质正确，报告的
    "默认开启"说法未能从官方文档证实，不引入）
27. 新增 Fine Pro 精确规则（2026-10-17 用户要求）：entitlement "Fine Pro"、
    product fine_subscription_yearly，取自上游 Curtinp118/Scripthub finepro.js
    v1.1.0；同日用户实机验证通过：App 显示"生效中"，下次续订 2100年1月1日
    （即注入的 2099-12-31T23:59:59Z），数据确认正确；match 用 strict 词边界
    （'fine' 为常用词，防子串误伤）
28. 新增 Nebuwall 精确规则（2026-10-17 用户要求）：entitlement wallpaper_pass、
    product wallpaper_pass_lifetime（买断型），数据取自上游，尚未用 offerings/
    真实响应核实，待实机验证
**************************************/

const $ = new Env("RevenueCat_Pro");
const NOTIFY_INTERVAL_HOURS = 12;
// 到期时间用 UTC 常量，与通知文案"有效期至：2099-12-31"一致
const FAKE_EXPIRES = '2099-12-31T23:59:59Z';

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
// 数据来源：2026-10-14 对上游 Reheji.js 422 条真实映射的词频统计，
// pro(134, 含 Pro 31)、premium(70, 含 Premium 28) 占绝对多数，其余按出现频次 >= 2 收录
const GUESS_NAMES = [
    'pro', 'Pro', 'premium', 'Premium', 'plus', 'Plus', 'vip', 'VIP',
    'all', 'allaccess', 'gold',
    'membership', 'advanced', 'lifetime', 'ultimate', 'super',
    'unlock', 'paid', 'full', 'business', 'team', 'family',
    'member', 'subscriber', 'deluxe', 'prime', 'elite',
    'premium_yearly', 'pro_yearly',
    'Pro access', 'pro_access', 'premium_access', 'pro_subscription',
    'All Access', 'AI Plus', 'ProVersionLifeTime', 'pro_lifetime',
    'pro-iOS', 'patron', 'Entitlement.Pro'
];

// 盲猜候选名构建：静态通用名 + 从 BID 派生的 "<token>.<suffix>"
// 例如 BID 含 datacalc 时会生成 datacalc.pro / datacalc.premium ……（DataCalc 真实 entitlement 就是 datacalc.pro）
// token 过滤顶级域名与通用词，避免生成 com.pro 这类无意义候选
// 后缀数据来源：422 条真实 entitlement 名尾段统计，pro(21) 居首，lifetime/yearly/annual/forever 为高频尾段
const GUESS_SUFFIXES = ['pro', 'premium', 'vip', 'plus', 'gold', 'membership', 'lifetime', 'yearly', 'annual', 'forever'];
// 噪声 token 数据来源：同上 bundle-id token 统计；me(如 me.xgmm.*)、www 为纯前缀噪声
const BID_NOISE = new Set(['com', 'net', 'org', 'io', 'co', 'cn', 'app', 'ios', 'mobile', 'inc', 'ltd', 'beta', 'me', 'www']);

function buildGuessNames(bid) {
    const names = GUESS_NAMES.slice();
    const seen = new Set(names);
    const blo = (bid || '').toLowerCase();
    const tokens = blo.split('.')
        .filter(t => t && t.length > 1 && !BID_NOISE.has(t));
    const push = (n) => { if (!seen.has(n)) { seen.add(n); names.push(n); } };
    for (const tok of tokens) {
        for (const suf of GUESS_SUFFIXES) {
            push(tok + '.' + suf); // datacalc.pro
            push(tok + '_' + suf); // umai_pro
        }
    }
    // 全 BID 派生：io.fadel.teleprompterx.pro、com.minardwu.cocam_lifetime 这类
    // entitlement 直接挂在完整 BID 后面的写法（422 样本验证可再 +3 命中）
    if (blo && blo.indexOf('.') > 0) {
        for (const suf of GUESS_SUFFIXES) {
            push(blo + '.' + suf);
            push(blo + '_' + suf);
        }
    }
    return names;
}

(function main() {
    // ---------- 1. 请求阶段：破除 304 缓存 ----------
    if (typeof $response === "undefined") {
        const headers = $request.headers || {};
        // 破除条件缓存：RevenueCat SDK 用 x-revenuecat-etag 做条件请求，
        // 命中缓存会返回 304（无 body），脚本就改不到响应。删掉它强制回 200 全量。
        // 标准条件头 If-None-Match / If-Modified-Since 顺手也删。
        for (const k of Object.keys(headers)) {
            const lk = k.toLowerCase();
            if (lk === 'if-none-match' || lk === 'if-modified-since' || lk === 'x-revenuecat-etag') {
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

    // 黑名单：bundle 精确匹配；UA 按前缀（词边界）或 "/xxx" 片段匹配。
    // 前缀加词边界：'forward' 不再误伤 'ForwardMail/2.0'（2026-10-15 审查 5.2）
    const isExcluded = EXCLUDE_BUNDLE_IDS.includes(lowerBID) ||
        EXCLUDE_UA_PREFIXES.some(prefix => {
            const esc = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            return new RegExp('^' + esc + '\\b').test(lowerUA) || lowerUA.includes('/' + prefix);
        });

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
        // 诊断：非订阅响应也记录顶层 keys；如果是 offerings，顺手抓出真实 product id，
        // 用于给未知 App 补充精确规则（只记录 key 名，不记录任何 token/隐私字段）
        try {
            const keys = obj ? Object.keys(obj).join(',') : '空body';
            console.log(`[RC] 非订阅响应，keys=[${keys}]`);
            const offerings = obj && obj.offerings;
            if (Array.isArray(offerings)) {
                const pids = [];
                const pkgmap = [];
                offerings.forEach(o => (o.packages || []).forEach(p => {
                    if (p.platform_product_identifier) {
                        pids.push(p.platform_product_identifier);
                        // 包标识（$rc_annual/$rc_monthly/$rc_lifetime 等）是判断订阅/买断的铁证
                        pkgmap.push(`${p.identifier || '?'} -> ${p.platform_product_identifier}`);
                    }
                }));
                if (pids.length) console.log(`[RC] Offerings 真实 product id: ${[...new Set(pids)].join(' | ')}`);
                if (pkgmap.length) console.log(`[RC] Offerings 包映射: ${[...new Set(pkgmap)].join(' | ')}`);
            }
        } catch (e) { /* 诊断失败不影响主流程 */ }
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
        { match: 'Sofa',         name: 'super',                                              id: 'sofa_family_29999_onetime',                 type: 'lifetime',     strict: true },
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
        { match: 'Pillow',       name: 'premium',                                            id: 'com.neybox.pillow.premium.year',           type: 'subscription', strict: true },
        { match: 'MoneyThings',  name: 'Premium',                                            id: 'com.lishaohui.cashflow.lifetime',          type: 'lifetime',     strict: false },
        { match: 'Anybox',       name: 'pro',                                                id: 'cc.anybox.Anybox.annual',                   type: 'subscription', strict: false },
        { match: 'ShellBean',    name: 'pro',                                                id: 'com.ningle.shellbean.iap.forever',         type: 'lifetime',     strict: false },
        { match: 'iplayTV',      name: 'com.ll.btplayer.12',                                 id: 'com.ll.btplayer.12',                         type: 'lifetime',     strict: false },
        { match: 'MOZE',         name: 'premium',                                            id: 'moze_pro_yearly',                            type: 'subscription', strict: false },
        { match: 'Vision',       name: 'pro',                                                id: 'com.vision.yearly_pro',                     type: 'subscription', strict: true },
        { match: 'Craft',        name: 'pro',                                                id: 'com.lukilabs.craft.pro.annual',             type: 'subscription', strict: true },
        { match: 'Structured',   name: 'pro',                                                id: 'today.structured.pro',                      type: 'subscription', strict: false },
        { match: 'Figma',        name: 'pro',                                                id: 'com.figma.ios.pro',                         type: 'subscription', strict: false },
        { match: 'Slopes',       name: 'pass',                                               id: 'com.breakthrough.slopes.annual_pass',      type: 'subscription', strict: false },
        // The Outsiders：product id 已从真实响应核实（display_name "Yearly Regular Outsider Absolute"，
        // 用户 2026-03-23 有过一年试用后取消）；entitlement 名未核实，用 GUESS_NAMES 候选集注入
        { match: 'outsiders',    names: GUESS_NAMES,                                        id: 'app.outsiders.subscription.EB.yearly',    type: 'subscription', strict: false },
        // Kelo：product id 已从 offerings 响应核实（2026-09-30）：
        // kelo_premium_anual / kelo_premium / kelo_premium_anual_trial7 / kelo_premium_trial7；
        // kelo_premium_anual 按命名判定为年订阅，先按 subscription 注入；entitlement 名未核实，用候选集
        { match: 'kelo',         names: GUESS_NAMES,                                        id: 'kelo_premium_anual',                          type: 'subscription', strict: false },
        // DataCalc（素材容量计算）：product 与 entitlement 均已核实（2026-10-09 用户提供）
        { match: 'datacalc',      name: 'datacalc.pro',                                      id: 'datacalc.yearly.12',                          type: 'subscription', strict: false },
        // Chengyu Calendar（成语日历）：product 与 entitlement 均已核实（2026-10-14 用户提供）
        { match: 'dailyidiom',    name: 'calendar',                                          id: 'com.fiachra.DailyIdiomApp.yearly',            type: 'subscription', strict: false },
        // Snipd（播客）：entitlement premium、product snipd_premium_1y_7199_trial_2w_v2 取自上游 Reheji.js，
        // 尚未用 offerings/真实响应核实（2026-10-14 用户要求直接加，待实机验证）
        { match: 'snipd',         name: 'premium',                                           id: 'snipd_premium_1y_7199_trial_2w_v2',          type: 'subscription', strict: false },
        // Fine Pro：entitlement "Fine Pro"、product fine_subscription_yearly 取自上游
        // Curtinp118/Scripthub finepro.js v1.1.0（2026-10-17）；2026-10-17 用户实机验证：
        // App 显示"生效中"，下次续订 2100年1月1日（即注入的 2099-12-31T23:59:59Z），
        // 数据确认正确；开通时间 2023-10-18 为保留的真实购买时间（5.1 修复生效）
        // match 用 strict 词边界——'fine' 是常用英文单词，子串匹配会误伤 define/refine 类 App
        { match: 'fine',          name: 'Fine Pro',                                          id: 'fine_subscription_yearly',                 type: 'subscription', strict: true  },
        // Nebuwall（壁纸与AI创作）：entitlement wallpaper_pass、product
        // wallpaper_pass_lifetime（买断型），数据取自上游（2026-10-17 用户提供），
        // 尚未用 offerings/真实响应核实；'nebuwall' 为独特品牌词，子串匹配风险低
        { match: 'nebuwall',      name: 'wallpaper_pass',                                    id: 'wallpaper_pass_lifetime',               type: 'lifetime',     strict: false }
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
        const exSub = sub.subscriptions[productId] || {};
        sub.subscriptions[productId] = {
            ...exSub,
            ...baseSubscription,
            // 保留真实购买时间（审查 5.1）：模板的 nowStr 不能抹掉用户真实购买记录
            "original_purchase_date": exSub.original_purchase_date || origStr,
            "purchase_date": exSub.purchase_date || nowStr
        };
        for (const n of entNames) {
            const exEnt = sub.entitlements[n] || {};
            sub.entitlements[n] = {
                ...exEnt,
                ...baseEntitlementSub,
                "purchase_date": exEnt.purchase_date || nowStr,
                "product_identifier": productId
            };
        }
    };

    const injectLifetime = (productId, entNames) => {
        for (const n of entNames) {
            const exEnt = sub.entitlements[n] || {};
            sub.entitlements[n] = {
                ...exEnt,
                ...baseEntitlementLifetime,
                "purchase_date": exEnt.purchase_date || nowStr,
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
        // 精确命中：按 type 只写一边；entitlement 支持 names 数组（候选集，未核实）或单个 name
        const entNames = rule.names || [rule.name];
        matchedAppKey = rule.match;
        targetId = rule.id;
        if (rule.type === 'lifetime') injectLifetime(rule.id, entNames);
        else injectSubscription(rule.id, entNames);
    } else {
        // 盲猜：只走订阅型注入，不写 non_subscriptions，避免同一 product 两边写
        // BID 取最后一段，但过滤纯顶级域名（如 thirteendoots.kelo.com -> com），此时改用 UA 的 App 名
        const TLD = new Set(['com', 'net', 'org', 'io', 'app', 'dev', 'me', 'co', 'cn']);
        let keyFromBid = BID ? BID.split('.').pop() : '';
        if (TLD.has(keyFromBid.toLowerCase())) keyFromBid = '';
        matchedAppKey = keyFromBid || ((rawUA.split('/')[0] || "App").split(' ')[0]);
        targetId = BID ? `${BID}.subscription` : `com.${matchedAppKey.toLowerCase()}.subscription`;
        // 盲猜候选集：静态通用名 + BID 派生（如 datacalc.pro）
        injectSubscription(targetId, buildGuessNames(BID));
    }

    // 统一延期现存 entitlement / subscription：把"已失效信号"（will_renew=false、
    // unsubscribe_detected_at、billing_issues_detected_at、is_sandbox=true 等）统一刷成
    // 正常订阅状态，只保留真实购买时间与 product_identifier。
    // 注意展开顺序：真实值在前、模板在后，否则真实值会把模板盖掉（2026-10-15 审查发现）。
    // 终身（expires_date 为 null，含刚注入的 lifetime 与用户真实买断）保持 null。
    for (const name of Object.keys(sub.entitlements)) {
        const cur = sub.entitlements[name] || {};
        const isLifetime = cur.expires_date === null || cur.expires_date === undefined;
        sub.entitlements[name] = {
            ...cur,
            ...(isLifetime ? baseEntitlementLifetime : baseEntitlementSub),
            "expires_date": isLifetime ? null : FAKE_EXPIRES,
            "grace_period_expires_date": null,
            "purchase_date": cur.purchase_date || nowStr,
            "product_identifier": cur.product_identifier || targetId
        };
    }
    for (const pid of Object.keys(sub.subscriptions)) {
        const cur = sub.subscriptions[pid] || {};
        sub.subscriptions[pid] = {
            ...cur,
            ...baseSubscription,
            "expires_date": FAKE_EXPIRES,
            "original_purchase_date": cur.original_purchase_date || origStr,
            "purchase_date": cur.purchase_date || nowStr
        };
    }

    // 通知节流：只在精确命中时发送，盲猜不再误报。
    // key 用 v2 命名空间，与旧版脚本的节流记录隔离，避免旧记录导致长期不通知。
    if (rule) {
        const cleanKey = rule.match.replace(/[^a-zA-Z0-9_-]/g, '_');
        const storageKey = `rc_notify_v2_${cleanKey}`;
        const lastNotify = $.getdata(storageKey) || 0;
        const hoursSince = (Date.now() - parseInt(lastNotify, 10)) / 36e5;
        if (hoursSince >= NOTIFY_INTERVAL_HOURS) {
            $.notify(`🎉 ${rule.match} 授权更新`, `已安全注入${rule.type === 'lifetime' ? '终身' : '永久'}凭证`, rule.type === 'lifetime' ? `终身有效` : `有效期至：2099-12-31`);
            $.setdata(Date.now().toString(), storageKey);
            console.log(`[RC] 已发送通知: ${storageKey}`);
        } else {
            console.log(`[RC] 通知节流中，跳过 (距上次 ${hoursSince.toFixed(1)}h，阈值 ${NOTIFY_INTERVAL_HOURS}h): ${storageKey}`);
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
