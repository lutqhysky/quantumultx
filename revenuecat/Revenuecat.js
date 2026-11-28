/*************************************
项目名称：RevenueCat 全能解锁 (2026 工业级重构版 · 修复版)
版本：2026-11-28 17:48（精简发布版）
规则：457 条精确规则（部分来自上游导入，标未核实）
行为：无本地规则时请求真实 offerings 反推权益名与 product id，从全部可用包各推
      一个候选名（去重，最多 4 个）+ token.pro 回退名，最多注 5 个名；注入的产品
      仍只有最优包一个；盲猜回退只注一个最可能权益名；终身写 non_subscriptions、
      订阅写 subscriptions；精确命中与 offerings 注入发通知（12h 节流）。
已知限制：Trusted Entitlements ENFORCED 模式下改写失效；INFORMATIONAL
      模式下是否生效取决于 App 是否检查验证结果，不保证生效；部分 App
      走 StoreKit 2 本地校验，脚本无法处理。
免责声明：仅供个人研究使用。
完整变更历史：见 GitHub 提交记录（lutqhysky/quantumultx mylove 分支
      revenuecat/Revenuecat.js）。
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
// 预编译 UA 前缀正则（Gemini 审查 3-1）：每次请求直接复用，不再动态 new RegExp
const EXCLUDE_UA_REGEXES = EXCLUDE_UA_PREFIXES.map((prefix) => {
    const esc = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('^' + esc + '\\b');
});
// C6：已知会检测/封禁 MITM 的 App（取自 Reheji.js forbiddenApps，2026-11-16），
// UA 或 bundle 或请求体命中即放行，不改写
const FORBIDDEN_APPS = [
    'PicSeedClient', 'ReflixiOS', 'Pomodoro', 'MyHabit',
    'Rond', 'Filebar', 'Fileball', 'APTV'
];
// C1：offerings 请求超时（毫秒）
const OFFERINGS_TIMEOUT_MS = 4000;
// P1#6：offerings 路径通知开关（offerings 属“半精确”，注入成功可单独通知；改为 false 关闭）
const OFFERINGS_NOTIFY = true;

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

// 噪声 token 数据来源：同上 bundle-id token 统计；me(如 me.xgmm.*)、www 为纯前缀噪声
const BID_NOISE = new Set(['com', 'net', 'org', 'io', 'co', 'cn', 'app', 'ios', 'mobile', 'inc', 'ltd', 'beta', 'me', 'www']);


// ---------- C2：按 product/package id 判定终身/订阅 ----------
// lifetime/forever/nonconsumable/onetime/one_time/one.time/life_time/permanen/_life/
// $rc_lifetime → 终身；其余（含 monthly/yearly/annual/weekly/six_month 与推断不明）→ 订阅
// （类型推断不明暂按订阅，col.or 先例；不用 Reheji 的 cm 字段，cm 语义未验证）
function classifyProductType(productId, packageId) {
    const s = (((productId || '') + ' ' + (packageId || '')).toLowerCase());
    if (/(lifetime|forever|nonconsumable|onetime|one[._-]time|life_time|life-time|permanen|_life|unlock_all|one_off|buyout|never_expire|\$rc_lifetime)/.test(s)) return 'lifetime';
    return 'subscription';
}
// trial/intro 包不作为首选注入对象（period_type=trial 易被 App 特殊处理）
function isTrialPackage(packageId, productId) {
    return /(trial|intro)/i.test((packageId || '') + ' ' + (productId || ''));
}
// 消耗型商品（钻石/金币/点数）不产生 entitlement，选包阶段直接排除
// 只按段匹配（consumable/coins/gems/credits）；items 不收（太宽），coinpack 类无分隔符复合词不收
function isConsumablePkg(productId) {
    return /(^|[._-])(consumable|coins?|gems?|credits?)([._-]|$)/i.test(productId || '');
}
// C1：从 offerings 反推 entitlement 名（尽力推断，未核实）
// 优先级：offering 标识（排除无意义的 default/standard）→ package 标识去 $rc_ 前缀
// （$rc_monthly 这类纯档期词跳过）→ product id 末段有意义 token；绝不用 $rc_* 直接当权益名
// C1：offerings 反推权益名——三道闸 + 回退盲猜（2026-11-18 第六份外部评审 F1，6 例全对）：
// ① offering id 先过噪声黑名单（档期词/通用词无语义）；② package 先剥档期后缀再判；
// ③ product token 再滤档期词/通用词/BID 自身 token（产品名里常混 App 名，如 exampleapp）；
// 实在没好名字回退 pickSingleGuessName(BID)，与盲猜路径保持一致。大小写保留原样
// （offering/product 的大小写是开发者的真实命名信号，统一小写会丢信息，见 F11 不采纳）。
// 档期词集与 deriveEntitlementName、pickSingleGuessName 共用
const DURATION = new Set(['monthly', 'annual', 'yearly', 'weekly', 'lifetime', 'sixmonth', 'six_month', 'threemonth', 'three_month', 'onemonth', 'one_month', 'twomonth', 'two_month', 'trial', 'intro', 'forever', 'permanent', 'one_time', 'onetime', 'life_time', 'life-time', 'permanen', 'unlimited', 'unlimited_access', 'nonconsumable', 'non_consumable', 'consumable', 'buyout', 'one_off', 'never_expire', 'unlock_all', 'one-time', 'pro-yearly', 'never-expire', 'unlimited-access', 'six-month', 'three-month', 'two-month', 'one-month', 'year', 'month', 'quarter', 'week', 'day']);
const OFFER_NOISE = new Set(['default', 'standard', 'annual', 'monthly', 'yearly', 'weekly', 'sale', 'promo', 'promotion', 'trial', 'intro', 'main', 'all', 'full', 'subscription', 'subscriptions', 'buy', 'purchase', 'order']);
// 权益词直返：token 本身就是常见权益名时（pro/premium/vip/plus/gold/unlock）直接用，
// 不再拼 .pro，也不被片段判断滤掉；'all' 不在内（它是噪声词，见 OFFER_NOISE）
const ENT_WORDS = new Set(['pro', 'premium', 'vip', 'plus', 'gold', 'unlock']);
function deriveEntitlementName(offeringId, packageId, productId, bid) {
    const off = (offeringId || '').trim();
    if (off && !OFFER_NOISE.has(off.toLowerCase())) return off;
    const pkg = (packageId || '').trim();
    if (pkg) {
        const stripped = pkg.replace(/^\$rc_/, '');
        // 自定义包：先剥尾部档期后缀（premium_monthly → premium），再判噪声与档期词
        const bare = stripped.replace(/[_-]?(monthly|annual|yearly|weekly|lifetime|forever|permanent)$/i, '');
        if (bare && !OFFER_NOISE.has(bare.toLowerCase()) && !DURATION.has(bare.toLowerCase())) return bare;
        if (stripped !== pkg && !OFFER_NOISE.has(stripped.toLowerCase())
            && !DURATION.has(stripped.toLowerCase())) {
            return stripped;
        }
    }
    // product id 反推：取末段非档期、非纯数字、非通用词、非 BID 自身 token
    // '_' 复合 token（如 one_time、lifetime_v1）先按 [._] 切分；其片段（如 time、v1）同样判为噪声
    const raw = (productId || '').split('.').filter(Boolean);
    // parts 与 partSeg 一一对应：partSeg[i] 是 parts[i] 所在的点分段（小写）。
    // isFragment 只在同一段内比较（Gemini 审查 2-3/3-5）：token 是残片当且仅当
    // 它所在的段是下划线复合词、比它长且包含它；跨段不再误杀——
    // com.app.studio_pack.studio 的末段 "studio" 不再被 "studio_pack" 丢弃，
    // 而同一段内 one_time 拆出的 time 仍被过滤。
    const parts = [];
    const partSeg = [];
    for (const q of raw) {
        const lq = q.toLowerCase();
        for (const p of q.split('_').filter(Boolean)) { parts.push(p); partSeg.push(lq); }
    }
    const isFragment = (f, seg) => {
        return !!seg && seg.includes('_') && seg.length > f.length && seg.includes(f);
    };
    const bidTokens = new Set((bid || '').toLowerCase().split('.').filter(t => t && t.length > 1));
    // App 名 token 常与产品 token 拼合（如 BID 的 example 与产品里的 exampleapp）：长 token（≥5 字符）按子串判
    const isBidLike = (t) => {
        for (const b of bidTokens) {
            if (b.length >= 5 && t.includes(b)) return true;   // t 含 b
            if (t.length >= 5 && b.includes(t)) return true;   // b 含 t（要求 t 也够长）
        }
        return false;
    };
    for (let i = parts.length - 1; i >= 0; i--) {
        let t = parts[i];
        // 剥版本后缀：带 v 的版本号（v1/v12）或带分隔符的数字（pro-1/pro_2）才剥；
        // ps5/xbox360/iphone15 不动（代价：pro1/app2 类不带分隔符的尾号不再剥）
        if (i === parts.length - 1) {
            const strippedVer = t.replace(/[._-]?v\d+$/i, '').replace(/[._-]\d+$/, '');
            if (strippedVer) t = strippedVer;
            else continue;
        }
        const lt = t.toLowerCase();
        if (ENT_WORDS.has(lt)) return t;  // 权益词直返（pro/premium/vip/plus/gold/unlock），不走片段判断
        if (!DURATION.has(lt) && !/^\d+$/.test(lt) && lt.length > 1
            && !BID_NOISE.has(lt) && !OFFER_NOISE.has(lt)
            && !bidTokens.has(lt) && !isBidLike(lt) && !isFragment(lt, partSeg[i])) return t;
    }
    // ★ 关键：与盲猜路径保持一致，回退到 <token>.pro
    return pickSingleGuessName(bid);
}
// C1 盲猜回退改为单名注入：BID 派生 token.pro 优先（如 datacalc.pro），无派生时用 pro（422 条真实 entitlement 名尾段统计，pro 居首）
// 取 BID 最后一段有意义 token（通常就是 App 名）；纯顶级域名/纯数字/档期词 token 已滤掉（2026-11-18 F10）
function pickSingleGuessName(bid) {
    const blo = (bid || '').toLowerCase();
    const tokens = blo.split('.').filter(t => t && t.length > 1 && !BID_NOISE.has(t) && !DURATION.has(t) && !/^\d+$/.test(t));
    if (!tokens.length) return 'pro';
    const last = tokens[tokens.length - 1];
    if (ENT_WORDS.has(last)) return last;  // BID 末段本身就是权益名（如 com.readme.pro），不拼成 pro.pro
    return last + '.pro';
}
// C1：多引擎 GET：$task.fetch → $httpClient.get → $https.get → $http.get
// 成功回调 onOk({status, body})；失败 onErr(message)。无任何可用引擎时直接 onErr。
function httpGetJson(url, headers, onOk, onErr) {
    const opts = { url: url, headers: headers };
    // R1：给支持超时的引擎传 timeout（setTimeout 兜底仍在）；$https/$http 不传，避免不认该选项
    const optsWithTimeout = { url: url, headers: headers, timeout: OFFERINGS_TIMEOUT_MS };
    try {
        if (typeof $task !== 'undefined' && $task && typeof $task.fetch === 'function') {
            const p = $task.fetch(optsWithTimeout);
            if (p && typeof p.then === 'function') {
                p.then(resp => {
                    const code = resp && (resp.statusCode || resp.status);
                    if (resp && code === 200) onOk({ status: code, body: resp.body });
                    else onErr('status ' + code);
                }).catch(e => onErr(String((e && e.message) || e)));
                return true;
            }
        }
    } catch (e) { /* 掉到下一引擎 */ }
    try {
        if (typeof $httpClient !== 'undefined' && $httpClient && typeof $httpClient.get === 'function') {
            $httpClient.get(optsWithTimeout, (err, resp, body) => {
                if (err) onErr(String(err));
                else if (resp && resp.status === 200) onOk({ status: resp.status, body: body });
                else onErr('status ' + (resp ? resp.status : 'none'));
            });
            return true;
        }
    } catch (e) { /* 掉到下一引擎 */ }
    try {
        if (typeof $https !== 'undefined' && $https && typeof $https.get === 'function') {
            $https.get(opts, (err, resp, body) => {
                if (err) onErr(String(err));
                else if (resp && resp.status === 200) onOk({ status: resp.status, body: body });
                else onErr('status ' + (resp ? resp.status : 'none'));
            });
            return true;
        }
    } catch (e) { /* 掉到下一引擎 */ }
    try {
        if (typeof $http !== 'undefined' && $http && typeof $http.get === 'function') {
            $http.get(opts, (err, resp, body) => {
                if (err) onErr(String(err));
                else if (resp && resp.status === 200) onOk({ status: resp.status, body: body });
                else onErr('status ' + (resp ? resp.status : 'none'));
            });
            return true;
        }
    } catch (e) { /* 无引擎 */ }
    onErr('no http engine');
    return false;
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
            // C7：比对前已转小写，X-RevenueCat-ETag 等大小写变体已覆盖，无需另列
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
        EXCLUDE_UA_PREFIXES.some((prefix, i) => EXCLUDE_UA_REGEXES[i].test(lowerUA) || lowerUA.includes('/' + prefix));

    if (isExcluded) {
        console.log(`[RC] 命中排除名单，放行: BID=${BID}, UA=${rawUA}`);
        $done({});
        return;
    }
    // C6：forbiddenApps 命中即放行（UA / bundle / 请求体任一命中）
    const reqBodyStr = ($request && typeof $request.body === 'string') ? $request.body : '';
    // 请求体小写只算一次（Gemini 审查 2-5）：循环内不再每次 toLowerCase
    const lowerReqBody = reqBodyStr.toLowerCase();
    const isForbidden = FORBIDDEN_APPS.some(a => {
        const la = a.toLowerCase();
        return lowerUA.includes(la) || lowerBID.includes(la) || lowerReqBody.includes(la);
    });
    if (isForbidden) {
        console.log(`[RC] 命中 forbiddenApps，放行: BID=${BID}, UA=${rawUA}`);
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
    // C6：offerings / attributes / adservices_attribution 请求直接放行，不改写响应
    // （offerings 的只读日志已在上面 !subscriber 分支保留；attributes POST 会返回
    // subscriber 对象，需在此拦截，避免误改写）
    const reqUrl = ($request && $request.url) || '';
    if (/(offerings|attributes|adservices_attribution)/i.test(reqUrl)) {
        console.log(`[RC] 放行（offerings/attributes 类请求不改写）: ${reqUrl}`);
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
    // C4：补齐次级字段（与订阅项一致；entitlement 对象上多出的字段 SDK 会忽略，仅用于字段完整性）
    const baseEntitlementLifetime = {
        "grace_period_expires_date": null,
        "purchase_date": nowStr,
        "expires_date": null,
        "period_type": "normal",
        "ownership_type": "PURCHASED",
        "store": "app_store",
        "is_sandbox": false,
        "unsubscribe_detected_at": null,
        "billing_issues_detected_at": null,
        "refunded_at": null,
        "auto_resume_date": null
    };
    const baseEntitlementSub = {
        "grace_period_expires_date": null,
        "purchase_date": nowStr,
        "expires_date": FAKE_EXPIRES,
        "period_type": "normal",
        "ownership_type": "PURCHASED",
        "store": "app_store",
        "is_sandbox": false,
        "unsubscribe_detected_at": null,
        "billing_issues_detected_at": null,
        "refunded_at": null,
        "auto_resume_date": null
    };
    const baseSubscription = {
        "expires_date": FAKE_EXPIRES,
        "original_purchase_date": origStr,
        "purchase_date": nowStr,
        "ownership_type": "PURCHASED",
        "store": "app_store",
        // 官方订阅示例含 store_transaction_id（真实值为商店交易号）；注入值留空串，仅补字段存在
        "store_transaction_id": "",
        "is_sandbox": false,
        "will_renew": true,
        "period_type": "normal",
        "billing_issues_detected_at": null,
        "grace_period_expires_date": null,
        "unsubscribe_detected_at": null,
        "refunded_at": null,
        "auto_resume_date": null
    };

    // 基础结构补全（不硬编码 original_application_version，避免干扰版本判断）
    sub.subscriptions = sub.subscriptions || {};
    sub.entitlements = sub.entitlements || {};
    sub.non_subscriptions = sub.non_subscriptions || {};
    // C3：first_seen / original_purchase_date 保留原值，缺失不伪造
    // （此前缺失时默认补 3 年前日期，现删除；original_application_version 本就不补）
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
        { match: 'outsiders',    names: GUESS_NAMES,                                        id: 'app.outsiders.subscription.EB.yearly',    type: 'subscription', strict: false, verified: false },
        // Kelo：product id 已从 offerings 响应核实（2026-09-30）：
        // kelo_premium_anual / kelo_premium / kelo_premium_anual_trial7 / kelo_premium_trial7；
        // kelo_premium_anual 按命名判定为年订阅，先按 subscription 注入；entitlement 名未核实，用候选集
        { match: 'kelo',         names: GUESS_NAMES,                                        id: 'kelo_premium_anual',                          type: 'subscription', strict: false, verified: false },
        // ECG Tracker+（心电图记录）：entitlement 名与 product 均已核实——上游 Reheji.js
        // 2026-11-28 当天新增：'ECG%20Tracker+': { name: 'ECG Tracker+', id: 'lifetime_v2', cm: 'sjc' }。
        // 之前两次失败的根因是权益名猜错：盲猜 ecgtrackerplus.pro 与 40 名候选集里都没有
        // 真名 'ECG Tracker+'（App 名本身带空格与加号），App 只认这个名。product lifetime_v2
        // 已由用户抓包的 offerings 核实（default_v2：yearly_v2/lifetime_v2/monthly_v2）。
        // cm sjc 经上游全表统计确认为终身型（50 条里 43 条终身产品、0 条订阅产品），
        // 故按 lifetime 写 non_subscriptions。规则数不变（仍 154 条）。未核实，待用户实机确认。
        { match: 'com.ecgtrackerplus', name: 'ECG Tracker+', id: 'lifetime_v2', type: 'lifetime', strict: false, verified: false },
        // DataCalc（素材容量计算）：product 与 entitlement 均已核实（2026-10-09 用户提供）
        { match: 'datacalc',      name: 'datacalc.pro',                                      id: 'datacalc.yearly.12',                          type: 'subscription', strict: false },
        // Chengyu Calendar（成语日历）：product 与 entitlement 均已核实（2026-10-14 用户提供）
        { match: 'dailyidiom',    name: 'calendar',                                          id: 'com.fiachra.DailyIdiomApp.yearly',            type: 'subscription', strict: false },
        // Snipd（播客）：entitlement premium、product snipd_premium_1y_7199_trial_2w_v2 取自上游 Reheji.js，
        // 尚未用 offerings/真实响应核实（2026-10-14 用户要求直接加，待实机验证）
        { match: 'snipd',         name: 'premium',                                           id: 'snipd_premium_1y_7199_trial_2w_v2',          type: 'subscription', strict: false, verified: false },
        // Fine Pro：entitlement "Fine Pro"、product fine_subscription_yearly 取自上游
        // Curtinp118/Scripthub finepro.js v1.1.0（2026-10-17）；2026-10-17 用户实机验证：
        // App 显示"生效中"，下次续订 2100年1月1日（即注入的 2099-12-31T23:59:59Z），
        // 数据确认正确；开通时间 2023-10-18 为保留的真实购买时间（5.1 修复生效）
        // match 用 strict 词边界——'fine' 是常用英文单词，子串匹配会误伤 define/refine 类 App
        { match: 'fine',          name: 'Fine Pro',                                          id: 'fine_subscription_yearly',                 type: 'subscription', strict: true  },
        // Nebuwall（壁纸与AI创作）：entitlement wallpaper_pass、product
        // wallpaper_pass_lifetime（买断型），数据取自上游（2026-10-17 用户提供），
        // 尚未用 offerings/真实响应核实；'nebuwall' 为独特品牌词，子串匹配风险低
        { match: 'nebuwall',      name: 'wallpaper_pass',                                    id: 'wallpaper_pass_lifetime',               type: 'lifetime',     strict: false, verified: false },
        // PocketTok：entitlement "pro"、product pockettok.pro.lifetime（买断型），
        // 数据取自用户 2026-10-17 抓包的真实响应（non_subscriptions/other_purchases
        // 均有该产品真实购买记录），已核实；'pockettok' 为独特品牌词，子串匹配风险低
        { match: 'pockettok',     name: 'pro',                                               id: 'pockettok.pro.lifetime',               type: 'lifetime',     strict: false },
        // ddgksf 映射表第一批（2026-10-18）：只借数据、逻辑不动；以下均未用真实响应核实。
        // 类型按 product id 关键词推断（lifetime/forever→买断，yearly/monthly→订阅）
        { match: 'accountit',     name: 'spenditPlus',                                        id: 'DesignTech.SIA.Spendit.Plus.Lifetime',      type: 'lifetime',     strict: false, verified: false },
        { match: 'byephotos',     name: 'ByePhotos access',                                  id: 'com.panicbyte.byephotos.lifetime.promotion', type: 'lifetime',     strict: false, verified: false },
        { match: 'photon',        name: 'photon.paid',                                       id: 'photon.bundle.yearly',                      type: 'subscription', strict: true, verified: false },
        { match: 'rats%20project', name: 'PandaTracker_Premiumv2',                           id: 'monthly_subscription_discount_idv3',          type: 'subscription', strict: false, verified: false },
        { match: 'lutcamera',     name: 'ProVersion',                                        id: 'com.uzero.funforcam.monthlysub',             type: 'subscription', strict: false, verified: false },
        // 'reader' 为常用词：2026-11-18 改为 'valo.reader'（BID 精确指向 Valo Reader），
        // 'MyPDF Reader'/'PDF Reader Pro'/'com.moondrop.reader' 不再误伤；
        // 注：'valo.reader' 含字面点号，只能靠 BID 命中（UA 是 Valo Reader 空格形式，不匹配），
        // 故另补一条 UA 形式规则；Reheji.js 第三批（2026-11-06），未用真实响应核实。
        // 'Island Reader' 规则仍放前面（顺序无害，'valo.reader' 已不会抢它的 UA）。
        { match: 'Island Reader', name: 'BookSpeak Pro',                                     id: 'com.luyaolab.bookspeak.lifetime',            type: 'lifetime',     strict: false, verified: false },
        { match: 'valo.reader',   name: 'vip2',                                              id: 'com.valo.reader.vip2.year',                  type: 'subscription', strict: true, verified: false },
        { match: 'Valo Reader',   name: 'vip2',                                              id: 'com.valo.reader.vip2.year',                  type: 'subscription', strict: false, verified: false },
        { match: 'imagex',        name: 'imagex.pro.ios',                                    id: 'imagex.pro.ios.lifetime',                    type: 'lifetime',     strict: false, verified: false },
        { match: 'procamera',     names: ['private_lightbox_entitlement','san_fran_entitlement','pro_camera_up_entitlement','procamera_full_entitlement'], id: 'com.cocologics.ProCamera.Up.Yearly', type: 'subscription', strict: false, verified: false },
        { match: 'neatnook',      name: 'com.neatnook.pro',                                  id: 'com.neatnook.pro.forever',                   type: 'lifetime',     strict: false, verified: false },
        // pinduoduo（2026-11-18 修正：原 match 'jinduoduo' 为拼写错，bundle id 已核实 com.xunmeng.pinduoduo；product 'mobile_vip' 类型推断不明，暂按订阅注入，待核实）
        { match: 'pinduoduo',     name: 'jinduoduoapp',                                      id: 'mobile_vip',                                  type: 'subscription', strict: false, verified: false },
        // Reheji.js 第一批（2026-10-31）：只借数据、逻辑不动；以下均未用真实响应核实。
        // bundle 区按 BID 精确匹配（最稳），listua 区按 UA 片段匹配
        { match: 'me.capilabs.sleep',           name: 'Capi - Sleep Factors Analysis Unlimited Access', id: 'me.capilabs.sleep.premium.lifetime',     type: 'lifetime',     strict: false, verified: false },
        { match: 'com.abighead.Widgets',        name: 'HiWidget.Pro',                                   id: 'com.abighead.Widgets.LifetimePro',     type: 'lifetime',     strict: false, verified: false },
        { match: 'com.minardwu.cocam',          name: 'com.minardwu.cocam_lifetime',                     id: 'com.minardwu.cocam_lifetime',           type: 'lifetime',     strict: false, verified: false },
        { match: 'io.fadel.TeleprompterX',      name: 'io.fadel.teleprompterx.pro',                     id: 'io.fadel.TeleprompterX.pro.lifetime',   type: 'lifetime',     strict: false, verified: false },
        { match: 'com.ausoco.umai',             name: 'umai_pro',                                       id: 'umai_pro_yearly',                       type: 'subscription', strict: false, verified: false },
        { match: 'com.voicedream.Voic',         name: 'standard',                                       id: 'vd_annual_79_3daytrial',                 type: 'subscription', strict: false, verified: false },
        { match: 'com.laser-focused.focus-ios', name: 'subscribed',                                     id: 'iap.io.masterbuilders.focus.pro_one_year', type: 'subscription', strict: false, verified: false },
        { match: 'varacare',                    name: 'varacare_pro',                                   id: 'com.beliveapptech.varacare.lifetime',  type: 'lifetime',     strict: false, verified: false },
        { match: 'SaveLoop',                    name: 'Sloop Pro',                                      id: 'com.sloopbrowser.www.plus.Lifetime',    type: 'lifetime',     strict: false, verified: false },
        { match: 'OpsCat',                      name: 'OpsCat - Server Monitor & SSH Pro',              id: 'LifetimeAccessOps',                       type: 'lifetime',     strict: false, verified: false },
        // Reheji.js 第二批（2026-11-03）：listua 区按 UA 片段匹配；未用真实响应核实
        { match: 'Readora',                     name: 'com.chengnayu.readora',                            id: 'com.chengnayu.readora.permanent',       type: 'lifetime',     strict: false, verified: false },
        // Reheji.js 第四批（2026-11-15）：listua 区按 UA 片段匹配；未用真实响应核实。
        // billmate 的 product 含 yearly，按 id 判年订阅；col.or 的 product 无后缀，类型推断不明暂按订阅注入
        // （不影响解锁），待核实；'billmate'、'col.or' 均为独特品牌词，子串匹配风险低
        { match: 'billmate',                    name: 'Bill Mate Pro',                                    id: 'com.billmate.plus.yearly',              type: 'subscription', strict: false, verified: false },
        { match: 'col.or',                      name: 'Color Plus',                                       id: 'com.color.plus',                        type: 'subscription', strict: false, verified: false },
        // Reheji.js 第五批（2026-11-16 全表合并，来源 @ddm1023，2026-11-13 版，仅供个人研究使用）：
        // 现有 54 条在前优先（首 match 胜出）；本批 93 条 listua 规则（终身 51 / 订阅 42，
        // strict 36，names 双权益 2 条），均未用真实响应核实。过滤：重叠 42、排除名单 2、
        // 中文编码 key 23、短 key 20、通用名 248、无名 4、存疑 1（me.xgmm.note 的 id
        // 20250203 为日期串）；type 一律按 C2 从 product id 判定（不用 Reheji 的 cm 字段）；
        // %20 形式（如 Island%20Reader）保留——UA 里 app 名经百分号编码，与本地空格形式
        // （Island Reader）各覆盖一种 UA 形态；双权益 names 数组的 id 用主 id，idb 未保留
        { match: 'Island%20Reader',              name: 'BookSpeak Pro',                          id: 'com.luyaolab.bookspeak.lifetime',                  type: 'lifetime', strict: false, verified: false },
        { match: 'volix',                        name: 'Device Kit Pro',                         id: 'com.volix.pro',                                    type: 'subscription', strict: true, verified: false },
        { match: 'Speaker%20Cleaner',            name: 'WaterEject Pro',                         id: 'lifetime_water_eject',                             type: 'lifetime', strict: false, verified: false },
        { match: 'MusicPlayer',                  name: 'com.zhuangmengting.player',              id: 'com.zhuangmengting.player.permanen',               type: 'lifetime', strict: true, verified: false },
        { match: 'VideoBlur',                    name: 'com.zhuangmengting.blur',                id: 'com.zhuangmengting.blur.pro.permanent',            type: 'lifetime', strict: true, verified: false },
        { match: 'PicPure',                      name: 'PicPure Pro',                            id: 'LifetimeAccess2',                                  type: 'lifetime', strict: true, verified: false },
        { match: 'Image2PDF',                    name: 'Convertly Pro',                          id: 'life_time_id',                                     type: 'lifetime', strict: false, verified: false },
        { match: 'OneTT',                        name: 'CloneCam Pro',                           id: 'clonecam.lifetime',                                type: 'lifetime', strict: true, verified: false },
        { match: 'ShowcasePro',                  name: 'ShowcasePro.Ultra',                      id: 'DesignTech.SIA.ShowcasePro.Ultra.Lifetime',        type: 'lifetime', strict: false, verified: false },
        { match: 'iOS/3001101',                  name: 'doneitPremium',                          id: 'DesignTech.SIA.Doneit.Premium.Plan.Lifetime',      type: 'lifetime', strict: false, verified: false },
        { match: 'Speedometer',                  name: 'SpeedometerLite Pro',                    id: 'speedometerlite_lifetime',                         type: 'lifetime', strict: true, verified: false },
        { match: 'Swish',                        name: 'Swish Pro',                              id: 'swish_pro_lifetime',                               type: 'lifetime', strict: true, verified: false },
        { match: 'PinDou',                       name: 'PinDou Pro',                             id: 'com.pangqing.pindou.pro0',                         type: 'subscription', strict: true, verified: false },
        { match: 'ReverseChallengeSwiftUI',      name: 'ReverseChallenge.Pro',                   id: 'com.abighead.ReverseChallenge.iap.pro',            type: 'subscription', strict: false, verified: false },
        { match: 'Ticket%20Lover',               name: 'com.minardwu.ticketlover_lifetime',      id: 'com.minardwu.ticketlover_lifetime',                type: 'lifetime', strict: false, verified: false },
        { match: 'rxframe',                      name: 'com.minardwu.rxframe_lifetime',          id: 'com.minardwu.rxframe_lifetime',                    type: 'lifetime', strict: true, verified: false },
        { match: 'TagCamera',                    name: 'TagCamera Pro',                          id: 'com.foxlin.tagcamera.pro.lifetime',                type: 'lifetime', strict: false, verified: false },
        { match: 'PhotoAlbumManager',            name: 'picseekpro',                             id: 'ape.lifetime',                                     type: 'lifetime', strict: false, verified: false },
        { match: 'weight',                       name: 'Weight Pro',                             id: 'weight.pro.lifetime',                              type: 'lifetime', strict: true, verified: false },
        { match: 'QuietCam',                     name: 'QuietCam Pro',                           id: 'pawelchmiel.quietcam.yearly',                      type: 'subscription', strict: false, verified: false },
        { match: 'OrbitFast',                    name: 'Orbit Fast Full',                        id: 'com.fastorbitapps.OrbitFast.premium.lifetime',     type: 'lifetime', strict: false, verified: false },
        { match: 'VidCap',                       name: 'io.fadel.vidcap.pro',                    id: 'io.fadel.vidcap.pro.lifetime',                     type: 'lifetime', strict: true, verified: false },
        { match: 'TheGreatMe',                   name: 'The Great Me Pro',                       id: 'thegreatme.forever',                               type: 'lifetime', strict: false, verified: false },
        { match: 'ai_music_generator',           name: 'music_generation_yearly_79_99',          id: 'music_generation_yearly_79_99',                    type: 'subscription', strict: false, verified: false },
        { match: 'ShouChong',                    name: 'lulemevip',                              id: 'lulemeYears',                                      type: 'subscription', strict: false, verified: false },
        { match: 'BeetleADB',                    name: 'beetle_pro',                             id: 'beetle_lifetime_pro',                              type: 'lifetime', strict: false, verified: false },
        { match: 'Awake',                        name: 'awake_pro',                              id: 'io.unorderly.awake.pro.lifetime_v1',               type: 'lifetime', strict: true, verified: false },
        { match: 'LaunchTrans',                  name: 'PicChat.Subscribe.Start',                id: 'Yearly.PicChat',                                   type: 'subscription', strict: false, verified: false },
        { match: 'stopwatch',                    name: 'remove_ads',                             id: 'hasen_stopwatch_remove_ads',                       type: 'subscription', strict: true, verified: false },
        { match: 'ArchiveList',                  name: 'pro_life',                               id: 'com.jy.ArchiveBox.pro_1',                          type: 'subscription', strict: false, verified: false },
        { match: 'AppBox',                       name: 'appbookmark_vip',                        id: 'GAB_Lifetime_VIP',                                 type: 'lifetime', strict: true, verified: false },
        { match: 'Sunlitt',                      name: 'sunlitt.pro',                            id: 'pro.lifetime',                                     type: 'lifetime', strict: true, verified: false },
        { match: 'Moonlitt',                     name: 'moonlitt.pro',                           id: 'moonlitt.pro.lifetime',                            type: 'lifetime', strict: false, verified: false },
        { match: 'A%20Widget',                   name: 'all_widgets',                            id: 'all_widgets',                                      type: 'subscription', strict: false, verified: false },
        { match: 'AccuFind',                     name: 'accufind_payments',                      id: 'accufind_lifetime',                                type: 'lifetime', strict: false, verified: false },
        { match: 'IPCams',                       names: ['pro', 'pro_plus'],                     id: 'ipcams_pro_lifetime',                              type: 'lifetime', strict: true, verified: false },
        { match: 'ArtStage',                     name: 'FullAccess',                             id: 'com.nicdeane.artstage.YearlySubscription',         type: 'subscription', strict: false, verified: false },
        { match: 'Infltr',                       name: 'com.Yooshr.infltr.subscriptionPremium',  id: 'com.Yooshr.infltr.everythingForever',              type: 'lifetime', strict: true, verified: false },
        { match: 'Vinyls',                       name: 'AllPro',                                 id: 'com.shi.Vin.lifetime',                             type: 'lifetime', strict: true, verified: false },
        { match: 'Wishy',                        name: 'Wishy Subscription',                     id: 'wishy_lifetime_subscription',                      type: 'lifetime', strict: true, verified: false },
        { match: 'becoming',                     name: 'Strength Pro',                           id: 'strength_membership_lifetime',                     type: 'lifetime', strict: true, verified: false },
        { match: 'Morphose',                     name: 'ProStandard',                            id: 'com.pixery.morphose.yearly',                       type: 'subscription', strict: false, verified: false },
        { match: 'Unfold',                       name: 'REDUCED_PRO_YEARLY',                     id: 'UNFOLD_PRO_YEARLY',                                type: 'subscription', strict: true, verified: false },
        { match: 'Binsoo',                       name: 'vibe',                                   id: 'annual',                                           type: 'subscription', strict: true, verified: false },
        { match: 'ChatPub',                      name: 'Unlimited Access',                       id: 'conversationai.annual',                            type: 'subscription', strict: true, verified: false },
        { match: 'quitnow',                      name: 'pro_features',                           id: 'com.eaginsoftware.QuitNow.unlock_all_pro_features', type: 'subscription', strict: true, verified: false },
        { match: 'ChatBot',                      name: 'chatbot_annual',                         id: 'chatbot_annual',                                   type: 'subscription', strict: true, verified: false },
        { match: 'VibeCamera',                   name: 'forever',                                id: 'vibe_pro_forever',                                 type: 'lifetime', strict: false, verified: false },
        { match: 'No%20Fusion',                  name: 'LivePhoto',                              id: 'com.grey.nofusion.livephoto',                      type: 'subscription', strict: false, verified: false },
        { match: 'Themy',                        name: 'fonts_premium',                          id: 'lifetime',                                         type: 'lifetime', strict: true, verified: false },
        { match: 'FujiLifeStyle',                name: 'FUJIStyle Pro(Year)',                    id: 'FujiStyle2024003',                                 type: 'subscription', strict: false, verified: false },
        { match: 'CharingCrossRoad',             name: 'ready_pro',                              id: 'ready_pro_50_1y',                                  type: 'subscription', strict: false, verified: false },
        { match: 'ig-bookmarker',                name: 'entitlement',                            id: 'lifetimeID',                                       type: 'lifetime', strict: false, verified: false },
        { match: 'CallAnnie',                    name: 'ai.animato.callannie.entitlement.pro0',  id: 'ai.animato.callannie.proyearly1',                  type: 'subscription', strict: false, verified: false },
        { match: 'moss-ios',                     name: 'prouser',                                id: 'dpbox_yearly_68',                                  type: 'subscription', strict: false, verified: false },
        { match: 'TQBrowser',                    name: 'pro_lt',                                 id: 'com.tk.client.lifetime',                           type: 'lifetime', strict: false, verified: false },
        { match: 'DHWaterMarkManager',           name: 'WaterManager_common',                    id: 'lifetimeVIP_001',                                  type: 'lifetime', strict: false, verified: false },
        { match: 'MaxWallpaper',                 name: 'maxwallpaper_common',                    id: 'super_forever_vip',                                type: 'lifetime', strict: false, verified: false },
        { match: 'Loora',                        name: 'Yearly',                                 id: 'yearly_free_ref_10usd_off',                        type: 'subscription', strict: true, verified: false },
        { match: 'Airmail',                      name: 'Airmail Premium',                        id: 'Airmail_iOS_Yearly_P',                             type: 'subscription', strict: true, verified: false },
        { match: 'ip_tv_react_native',           name: 'Single',                                 id: 'opus.lifetime',                                    type: 'lifetime', strict: false, verified: false },
        { match: 'timetrack.io',                 name: 'atimelogger-premium-plus',               id: 'ttio_premium_plus',                                type: 'subscription', strict: false, verified: false },
        { match: 'Video%20Teleprompter',         name: 'videoPremium',                           id: 'com.joeallenpro.videoteleprompter.upgrade.yearly_a', type: 'subscription', strict: false, verified: false },
        { match: 'rewritingText',                name: 'AIGrammercheckerProAccess',              id: 'sv.aigrammerchecker.com.lifetime',                 type: 'lifetime', strict: false, verified: false },
        { match: 'ShellBoxKit',                  name: 'ssh_pro',                                id: 'ShellBoxKit.Year',                                 type: 'subscription', strict: false, verified: false },
        { match: 'Whisper',                      name: 'all_features',                           id: 'whisperai_80_y',                                   type: 'subscription', strict: true, verified: false },
        { match: 'AnimeArt',                     name: 'AnimeArt.Gold',                          id: 'WaifuArt.Lifetime',                                type: 'lifetime', strict: false, verified: false },
        { match: 'MusicPutty',                   name: 'pro_version',                            id: 'mp_3599_1y',                                       type: 'subscription', strict: false, verified: false },
        { match: 'Sex%20Actions',                name: 'Premium Plus',                           id: 'ru.sexactions.subscriptionPromo1',                 type: 'subscription', strict: false, verified: false },
        { match: 'LockFlow',                     name: 'unlimited_access',                       id: 'lf_00.00_lifetime',                                type: 'lifetime', strict: false, verified: false },
        { match: 'VoiceAI',                      name: 'Special Offer',                          id: 'voiceannualspecial',                               type: 'subscription', strict: true, verified: false },
        { match: 'AIKeyboard',                   name: 'plus_keyboard',                          id: 'aiplus_keyboard_yearly',                           type: 'subscription', strict: false, verified: false },
        { match: 'LazyReply',                    name: 'lazyReplyYearlySubscription',            id: 'com.bokhary.lazyreply.yearlyprosubscription',      type: 'subscription', strict: false, verified: false },
        { match: 'LazyBoard',                    name: 'lazyboardPro',                           id: 'com.bokhary.magicboard.magicboardpro',             type: 'subscription', strict: false, verified: false },
        { match: 'PDF%20Viewer',                 name: 'sub.pro',                                id: 'com.pspdfkit.viewer.sub.pro.yearly',               type: 'subscription', strict: false, verified: false },
        { match: 'Persona',                      name: 'unlimited',                              id: 'com.tickettothemoon.video.persona.one.time.purchase', type: 'lifetime', strict: true, verified: false },
        { match: 'easy_chart',                   name: 'unlock all',                             id: 'qgnjs_lifetime',                                   type: 'lifetime', strict: false, verified: false },
        { match: 'Tide%20Guide',                 name: 'Tides+',                                 id: 'TideGuidePro_Lifetime_Family_149.99',              type: 'lifetime', strict: false, verified: false },
        { match: 'ASKAI',                        names: ['pro', 'pro_plan'],                     id: 'askai_pro',                                        type: 'subscription', strict: true, verified: false },
        { match: 'shipian-ios',                  name: 'vipOffering',                            id: 'shipian_25_forever',                               type: 'lifetime', strict: false, verified: false },
        { match: 'tiimo',                        name: 'full_access',                            id: 'lifetime.iap',                                     type: 'lifetime', strict: true, verified: false },
        { match: 'Project%20Delta',              name: 'rc_entitlement_obscura_ultra',           id: 'com.benricemccarthy.obscura4.obscura_ultra_lifetime', type: 'lifetime', strict: false, verified: false },
        { match: 'Zettelbox',                    name: 'Power Pack',                             id: 'powerpack_permanent_1',                            type: 'lifetime', strict: false, verified: false },
        { match: 'Context_iOS',                  name: 'Context Pro',                            id: 'ctx_sub_1y_sspai_preorder_angel',                  type: 'subscription', strict: false, verified: false },
        { match: 'MySticker',                    name: 'mysticker premium',                      id: 'com.miiiao.MySticker.lifetime',                    type: 'lifetime', strict: false, verified: false },
        { match: 'Stress',                       name: 'StressWatch Pro',                        id: 'stress_membership_lifetime',                       type: 'lifetime', strict: true, verified: false },
        { match: 'Worrydolls',                   name: 'magicmode',                              id: 'magicmode',                                        type: 'subscription', strict: false, verified: false },
        { match: 'Falendar',                     name: 'Falendar+',                              id: 'falendar_68_life',                                 type: 'lifetime', strict: false, verified: false },
        { match: 'Alpenglow',                    name: 'newPro',                                 id: 'ProLifetime',                                      type: 'lifetime', strict: false, verified: false },
        { match: 'Decision',                     name: 'com.nixwang.decision.entitlements.pro',  id: 'com.nixwang.decision.pro.annual',                  type: 'subscription', strict: true, verified: false },
        { match: 'audiomack-iphone',             name: 'Premium1',                               id: 'com.audiomack.premium.2022',                       type: 'subscription', strict: false, verified: false },
        { match: 'MallocVPN',                    name: 'IOS_PRO',                                id: 'malloc_yearly_vpn',                                type: 'subscription', strict: false, verified: false },
        { match: 'Seamless',                     name: 'Seamless.Pro',                           id: 'net.shinystone.Seamless.Pro',                      type: 'subscription', strict: true, verified: false },
        { match: 'markbuy',                      name: 'premium',                                id: 'com.markbuy.plus',                                 type: 'lifetime', strict: false  },
        { match: 'touchretouch',                 name: 'premium',                                id: 'tr5_yearlysubsc_15dlrs_2',                         type: 'subscription', strict: false },
        { match: 'bg remover',                   name: 'Premium',                                id: 'net.kaleidoscope.cutout.premium1',                 type: 'subscription', strict: false, verified: false },
        { match: 'com.socialayf.joi',            names: ['pro', 'joi.pro'],                      id: 'com.socialayf.joi.pro.lifetime',                   type: 'lifetime', strict: false },
        { match: 'app.bookorbit.reader',         name: 'premium',                                id: 'app.bookorbit.reader.premium.lifetime',          type: 'lifetime', strict: false, verified: false },
        // Reheji.js 第六批全量导入（2026-11-28）：上游 438 条去重后真正新增 303 条，
        // 全部标 verified: false（未用真实响应核实，待用户实机验证）。bundle 区按 BID 精确匹配，
        // listua 区按 UA 片段匹配；type 按 C2 从 product id 判定，73 条无关键词者按上游 cm 兜底
        //（sja→subscription，sjb/sjc→lifetime）。追加在数组末尾，现有规则优先命中。
        // --- bundle 区 ---
        { match: 'app.imone.OneWidget',    name: 'pro',                    id: 'app.imone.OneWidget.Lifetime',                              type: 'lifetime',     strict: false, verified: false },
        { match: 'camp.user.penbook',      name: 'pro',                    id: 'penbook.lifetime01',                                        type: 'lifetime',     strict: false, verified: false },
        { match: 'co.visualsupply.cam',    name: 'pro',                    id: 'vscopro_global_5999_annual_7D_free',                        type: 'subscription', strict: false, verified: false },
        { match: 'com.exoplanet.chatme',   name: 'premium',                id: 'chatme_premium_year_trial',                                 type: 'subscription', strict: false, verified: false },
        { match: 'com.flexicalc.app',      name: 'pro',                    id: 'pro_product',                                               type: 'subscription', strict: false, verified: false },
        { match: 'com.OfflineMusic.www',   name: 'premium',                id: 'com.OfflineMusic.www.lifetime298',                          type: 'lifetime',     strict: false, verified: false },
        { match: 'com.qiqi1996.app-poster', name: 'vip',                    id: 'app_poster_lifetime',                                       type: 'lifetime',     strict: false, verified: false },
        { match: 'com.qiqi1996.card-note', name: 'vip',                    id: 'qi_card_note_lifetime',                                     type: 'lifetime',     strict: false, verified: false },
        { match: 'com.qiqi1996.pause-life', name: 'vip',                    id: 'pause_life_lifetime',                                       type: 'lifetime',     strict: false, verified: false },
        { match: 'com.qiqi1996.qi-watermark', name: 'vip',                    id: 'com.qiqi1996.qi_watermark.yearly',                          type: 'subscription', strict: false, verified: false },
        { match: 'com.qiqi1996.think-action', name: 'vip',                    id: 'think_action.yearly',                                       type: 'subscription', strict: false, verified: false },
        { match: 'com.reader.book',        name: 'pro',                    id: 'reader.lifetimeFamily.pro',                                 type: 'lifetime',     strict: false, verified: false },
        { match: 'com.reku.Counter',       name: 'plus',                   id: 'com.reku.counter.plus.lifetime',                            type: 'lifetime',     strict: false, verified: false },
        { match: 'com.roehl',              name: 'Pro',                    id: 'habitkit_3499_lt',                                          type: 'lifetime',     strict: false, verified: false },
        { match: 'com.runbuddy.prod',      name: 'premium',                id: 'rb_9999_1y_1y7999',                                         type: 'subscription', strict: false, verified: false },
        { match: 'com.skysoft.removalfree', name: 'Pro',                    id: 'com.skysoft.removalfree.subscription.newyearly',            type: 'subscription', strict: false, verified: false },
        { match: 'com.suxuanlv.startsleepapp', name: 'vip',                    id: 'kaishui_vip_lifetime',                                      type: 'lifetime',     strict: false, verified: false },
        { match: 'com.trainfitness.Train', name: 'Pro',                    id: 'TrainAnnualSubscription',                                   type: 'subscription', strict: false, verified: false },
        { match: 'com.ukgroup.translator', name: 'Pro',                    id: 'lifetime_translator',                                       type: 'lifetime',     strict: false, verified: false },
        { match: 'com.valo.reader',        name: 'com.valo.reader.vip1.forever', id: 'com.valo.reader.vip1.forever',                              type: 'lifetime',     strict: false, verified: false },
        { match: 'com.zhang333.dd',        name: 'premium',                id: 'com.zhang3.plus',                                           type: 'lifetime',     strict: false, verified: false },
        { match: 'design.yugen.Flow',      name: 'pro',                    id: 'design.yugen.Flow.Lifetime',                                type: 'lifetime',     strict: false, verified: false },
        { match: 'io.innerpeace.yiye',     name: 'Premium',                id: 'io.innerpeace.yiye.lifetime.forYearly',                     type: 'lifetime',     strict: false, verified: false },
        { match: 'me.xgmm.meallog',        names: GUESS_NAMES,             id: '202602071529',                                              type: 'lifetime',     strict: false, verified: false },
        { match: 'me.xgmm.note',           name: 'one month',              id: '20250203',                                                  type: 'lifetime',     strict: false, verified: false },
        { match: 'moonbox.co.il.grow',     name: 'pro',                    id: 'moonbox.co.il.grow.lifetime.offer',                         type: 'lifetime',     strict: false, verified: false },
        { match: 'net.tengl.powertimer',   name: 'plus',                   id: 'powertimer.plus',                                           type: 'lifetime',     strict: false, verified: false },
        { match: 'tech.miidii.MDClock',    name: 'Entitlement.Pro',        id: 'tech.miidii.MDClock.pro',                                   type: 'lifetime',     strict: false, verified: false },
        // --- listua 区 ---
        { match: '1Blocker',               name: 'premium',                id: 'blocker.ios.iap.lifetime',                                  type: 'lifetime',     strict: false, verified: false },
        { match: 'adbTools',               name: 'pro_lifetime',           id: 'com.jy.adbTools.pro_1',                                     type: 'lifetime',     strict: false, verified: false },
        { match: 'AICalculator',           name: 'Premium',                id: 'com.simpleinnovation.calculator.ai.premium.yearly.base',    type: 'subscription', strict: false, verified: false },
        { match: 'AIChat',                 name: 'AI Plus',                id: 'ai_plus_yearly',                                            type: 'subscription', strict: false, verified: false },
        { match: 'Aisten',                 name: 'pro',                    id: 'aisten_pro',                                                type: 'lifetime',     strict: false, verified: false },
        { match: 'AI Chat',                name: 'AI Plus',                id: 'ai_plus_gpt_yearly',                                        type: 'subscription', strict: false, verified: false },
        { match: 'alistTools',             name: 'pro_lifetime',           id: 'com.jy.alistTools.pro_lifetime',                            type: 'lifetime',     strict: false, verified: false },
        { match: 'andyworks-calculator',   name: 'patron',                 id: 'com.andyworks.weather.yearlyPatron',                        type: 'subscription', strict: false, verified: false },
        { match: 'AnkiPro',                name: 'Premium',                id: 'com.ankipro.app.lifetime',                                  type: 'lifetime',     strict: false, verified: false },
        { match: 'Aphrodite',              name: 'all',                    id: 'com.ziheng.aphrodite.onetime',                              type: 'lifetime',     strict: false, verified: false },
        { match: 'apollo',                 name: 'all',                    id: 'com.ziheng.apollo.onetime',                                 type: 'lifetime',     strict: false, verified: false },
        { match: 'app/112',                name: 'Pro',                    id: 'com.wengqianshan.friends.pro',                              type: 'lifetime',     strict: false, verified: false },
        { match: 'app/38',                 name: 'Pro',                    id: 'com.wengqianshan.diet.pro',                                 type: 'lifetime',     strict: false, verified: false },
        { match: 'APTV',                   name: 'Pro',                    id: 'com.kimen.aptvpro.lifetime',                                type: 'lifetime',     strict: false, verified: false },
        { match: 'Assembly',               name: 'premium_access',         id: 'com.pixite.assembly.1yearlyq',                              type: 'subscription', strict: false, verified: false },
        { match: 'Atomic',                 name: 'pro',                    id: 'ht_lifetime1',                                              type: 'lifetime',     strict: false, verified: false },
        { match: 'Authenticator',          name: 'premium',                id: '2fa_standalone_lifetime',                                   type: 'lifetime',     strict: false, verified: false },
        { match: 'BabyCare',               name: 'pro',                    id: 'KiddoKeeper_38_LifeTime',                                   type: 'lifetime',     strict: false, verified: false },
        { match: 'bluredit',               name: 'Premium',                id: 'net.kaleidoscope.bluredit.premium1',                        type: 'subscription', strict: false, verified: false },
        { match: 'Boar',                   name: 'pro-iOS',                id: 'boar.yearly',                                               type: 'subscription', strict: false, verified: false },
        { match: 'BORD',                   name: 'pro_membership',         id: 'bord_plus_2499_lifetime',                                   type: 'lifetime',     strict: false, verified: false },
        { match: 'Brass',                  name: 'pro',                    id: 'brass.pro.annual',                                          type: 'subscription', strict: false, verified: false },
        { match: 'Browser',                name: 'pro',                    id: 'pro_zoomable',                                              type: 'lifetime',     strict: false, verified: false },
        { match: 'ByePhotos',              name: 'ByePhotos access',       id: 'com.panicbyte.byephotos.lifetime',                          type: 'lifetime',     strict: false, verified: false },
        { match: 'CalculatorJ',            name: 'pro',                    id: 'com.calculatorx.lifetime',                                  type: 'lifetime',     strict: false, verified: false },
        { match: 'Calflow',                name: 'pro',                    id: 'kike.calflow.pro.lifetime',                                 type: 'lifetime',     strict: false, verified: false },
        { match: 'Carbon-iOS',             name: 'pro',                    id: 'carbon.unlockall',                                          type: 'lifetime',     strict: false, verified: false },
        { match: 'CardPhoto',              name: 'allaccess',              id: 'CardPhoto_Pro',                                             type: 'lifetime',     strict: false, verified: false },
        { match: 'Charge',                 name: 'premium',                id: 'charge.iap.special',                                        type: 'lifetime',     strict: false, verified: false },
        { match: 'ChatGPTApp',             name: 'Advanced',               id: 'com.palligroup.gpt3.yearlyyy',                              type: 'subscription', strict: false, verified: false },
        { match: 'ChatLLM',                name: 'Pro',                    id: 'com.curiouscreatorsco.ChatLLM.pro.lifetime.notrial.150_00', type: 'lifetime',     strict: false, verified: false },
        { match: 'Chatty',                 name: 'pro',                    id: 'chatty.yearly.1',                                           type: 'subscription', strict: false, verified: false },
        { match: 'Chat练口语',                name: 'Pro access',             id: 'com.tech.AiSpeak.All',                                      type: 'lifetime',     strict: false, verified: false },
        { match: 'CircleTime',             name: 'Premium',                id: '000',                                                       type: 'lifetime',     strict: false, verified: false },
        { match: 'ClevCalc',               name: 'Premium',                id: 'com.dencreak.dlcalculator.iap.dlc_no_ads_permanent',        type: 'lifetime',     strict: false, verified: false },
        { match: 'Clipboard',              name: 'Premium',                id: 'Premium_0_99_1M_1MFree',                                    type: 'subscription', strict: false, verified: false },
        { match: 'CodeScanner',            name: 'pro',                    id: 'pro_forever_399',                                           type: 'lifetime',     strict: false, verified: false },
        { match: 'CollageMaker',           name: 'pro',                    id: 'com.livintis.collagemakerplus.yearly.1',                    type: 'subscription', strict: false, verified: false },
        { match: 'Collect',                name: 'pro',                    id: 'com.revenuecat.product.yearly.ios',                         type: 'subscription', strict: false, verified: false },
        { match: 'Color Widgets',          name: 'pro',                    id: 'cw_1999_1y_3d0',                                            type: 'subscription', strict: false, verified: false },
        { match: 'ContextApp',             name: 'plus',                   id: 'context_1y',                                                type: 'lifetime',     strict: false, verified: false },
        { match: 'Cookie',                 name: 'allaccess',              id: 'app.ft.Bookkeeping.lifetime',                               type: 'lifetime',     strict: false, verified: false },
        { match: 'CountdownWidget',        name: 'pro',                    id: 'cd_lifetime',                                               type: 'lifetime',     strict: false, verified: false },
        { match: 'CPUMonitor',             name: 'Pro',                    id: 'com.mars.cpumonitor_removeAd',                              type: 'lifetime',     strict: false, verified: false },
        { match: 'Currency',               name: 'plus',                   id: 'com.jeffreygrossman.currencyapp.iap.plus',                  type: 'subscription', strict: false, verified: false },
        { match: 'Dailyart',               name: 'lifeTime',               id: 'artLifeTime',                                               type: 'lifetime',     strict: false, verified: false },
        { match: 'DarkLooker',             name: 'Pro',                    id: 'com.boleStudio.safaridarkmode.permanent',                   type: 'lifetime',     strict: false, verified: false },
        { match: 'DayPoem',                name: 'Pro Access',             id: 'com.uzero.poem.month1',                                     type: 'subscription', strict: false, verified: false },
        { match: 'demo_FingerChooser',     name: 'pro',                    id: 'chooser.pro.lifetime',                                      type: 'lifetime',     strict: false, verified: false },
        { match: 'Dotly',                  name: 'premium',                id: 'dotly_premium_1_yearly',                                    type: 'subscription', strict: false, verified: false },
        { match: 'Drops',                  name: 'premium',                id: 'forever_unlimited_time_discounted_80_int',                  type: 'lifetime',     strict: false, verified: false },
        { match: 'Drowsy',                 name: 'Pro',                    id: 'Drowsy_Life',                                               type: 'lifetime',     strict: false, verified: false },
        { match: 'dtdvibe',                name: 'pro',                    id: 'com.dtd.aroundu.life',                                      type: 'lifetime',     strict: false, verified: false },
        { match: 'DualLensPro',            name: 'premium',                id: 'com.dualcapture.lifetime',                                  type: 'lifetime',     strict: false, verified: false },
        { match: 'Dumb Phone',             name: 'Pro',                    id: 'dp.lifetime_19.99',                                         type: 'lifetime',     strict: false, verified: false },
        { match: 'EasyClicker',            name: 'pro',                    id: 'easyclicker.premium.discount2',                             type: 'lifetime',     strict: false, verified: false },
        { match: 'Echo',                   name: 'PLUS',                   id: 'com.LEMO.LemoFm.plus.lifetime.l3',                          type: 'lifetime',     strict: false, verified: false },
        { match: 'ElementNote',            name: 'pro',                    id: 'com.soysaucelab.element.note.lifetime',                     type: 'lifetime',     strict: false, verified: false },
        { match: 'ElonAI',                 name: 'premium',                id: 'elongpt.yearly_1',                                          type: 'subscription', strict: false, verified: false },
        { match: 'Email Me',               name: 'premium',                id: 'ventura.media.EmailMe.premium.lifetime',                    type: 'lifetime',     strict: false, verified: false },
        { match: 'EncryptNote',            name: 'Pro',                    id: 'com.gaapp.2019note.noAds',                                  type: 'lifetime',     strict: false, verified: false },
        { match: 'Erasee',                 name: 'pro',                    id: 'erasee.pro.lifetime',                                       type: 'lifetime',     strict: false, verified: false },
        { match: 'EraseIt',                name: 'ProVersionLifeTime',     id: 'com.uzero.cn.eraseit.premium1.fromyear',                    type: 'lifetime',     strict: false, verified: false },
        { match: 'Facebook',               name: 'pro',                    id: 'fb_pro_lifetime',                                           type: 'lifetime',     strict: false, verified: false },
        { match: 'fastdiet',               name: 'premium',                id: 'com.happy.fastdiet.forever',                                type: 'lifetime',     strict: false, verified: false },
        { match: 'fengling',               name: 'Pro',                    id: 'com.nocmt.fengling.NewLifetime',                            type: 'lifetime',     strict: false, verified: false },
        { match: 'FitCurve',               name: 'pro',                    id: 'com.fitcurve.pro.lifetime',                                 type: 'lifetime',     strict: false, verified: false },
        { match: 'Flourish',               name: 'Pro',                    id: 'flourish_9800_1yr_1m0',                                     type: 'subscription', strict: false, verified: false },
        { match: 'FocusFour',              name: 'pro',                    id: 'focusfour_lifetime',                                        type: 'lifetime',     strict: false, verified: false },
        { match: 'FoJiCam',                name: 'ProVersionLifeTime',     id: 'com.uzero.cn.fojicam.life2',                                type: 'lifetime',     strict: false, verified: false },
        { match: 'Fontsify',               name: 'pro',                    id: 'media.upstate.fontify.lifetime',                            type: 'lifetime',     strict: false, verified: false },
        { match: 'Food-Diary',             name: 'Premium',                id: 'fd_lifetime',                                               type: 'lifetime',     strict: false, verified: false },
        { match: 'Free',                   name: 'pro',                    id: 'appspree_pro_lifetime',                                     type: 'lifetime',     strict: false, verified: false },
        { match: 'FretTrainer',            name: 'pro_subscription',       id: 'frettrainer.sub.yearly.pro',                                type: 'subscription', strict: false, verified: false },
        { match: 'FRMD',                   name: 'all_access',             id: 'frmd_plus_999_lifetime',                                    type: 'lifetime',     strict: false, verified: false },
        { match: 'FruitMinder',            name: 'Premium',                id: 'com.bartozo.FruitMinder.lifetime',                          type: 'lifetime',     strict: false, verified: false },
        { match: 'Gear',                   name: 'subscription',           id: 'com.gear.app.yearly',                                       type: 'subscription', strict: false, verified: false },
        { match: 'GLPTracker',             name: 'Pro Access',             id: 'com.doseflow.glp1tracker.lifetime.premium',                 type: 'lifetime',     strict: false, verified: false },
        { match: 'GradientMusic',          name: 'Pro',                    id: 'com.gradient.vision.new.music.one.time.79',                 type: 'lifetime',     strict: false, verified: false },
        { match: 'GrowthPath',             name: 'Premium',                id: 'GrowthPath_IAP_Lifetime',                                   type: 'lifetime',     strict: false, verified: false },
        { match: 'Habitor',                name: 'premium',                id: 'habitor_lifetime',                                          type: 'lifetime',     strict: false, verified: false },
        { match: 'Happy:Days',             name: 'pro',                    id: 'happy_999_lifetime',                                        type: 'lifetime',     strict: false, verified: false },
        { match: 'Harukong',               name: 'premium',                id: 'com.bluesignum.harukong.lifetime.premium',                  type: 'lifetime',     strict: false, verified: false },
        { match: 'Heal Clock',             name: 'pro',                    id: 'com.mad.HealClock.pro',                                     type: 'lifetime',     strict: false, verified: false },
        { match: 'Hi论坛/69',                name: 'plus',                   id: 'plus_yearly',                                               type: 'subscription', strict: false, verified: false },
        { match: 'HRZN',                   name: 'pro',                    id: 'plus_999_lifetime',                                         type: 'lifetime',     strict: false, verified: false },
        { match: 'HTTPBot',                name: 'pro',                    id: 'com.behindtechlines.HTTPBot.prounlock',                     type: 'lifetime',     strict: false, verified: false },
        { match: 'HurtYou',                name: 'premium',                id: 'hurtyou_199_1y',                                            type: 'subscription', strict: false, verified: false },
        { match: 'iBody',                  name: 'Pro',                    id: 'com.tickettothemoon.bodyfilter.one.time.purchase',          type: 'lifetime',     strict: false, verified: false },
        { match: 'IDM',                    name: 'premium',                id: 'sub_yearly_idm',                                            type: 'subscription', strict: false, verified: false },
        { match: 'image_upscaler',         name: 'pro',                    id: 'yearly_sub_pro',                                            type: 'subscription', strict: false, verified: false },
        { match: 'ImagineAI',              name: 'plus',                   id: 'artistai.lifetime.1',                                       type: 'lifetime',     strict: false, verified: false },
        { match: 'intervalFlow',           name: 'All Access',             id: 'wodtimer_lf',                                               type: 'lifetime',     strict: false, verified: false },
        { match: 'IPTVUltra',              name: 'premium',                id: 'com.ddm1023.lifetime',                                      type: 'lifetime',     strict: false, verified: false },
        { match: 'iRead',                  name: 'vip',                    id: 'com.vip.forever_1',                                         type: 'lifetime',     strict: false, verified: false },
        { match: 'Jellycuts',              name: 'pro',                    id: 'premium',                                                   type: 'subscription', strict: false, verified: false },
        { match: 'jinduoduo_calculator',   name: 'yuhuzi001',              id: 'lifetime_vip',                                              type: 'lifetime',     strict: false, verified: false },
        { match: 'Journal_iOS',            name: 'PRO',                    id: 'com.pureformstudio.diary.yearly_2022_promo',                type: 'subscription', strict: false, verified: false },
        { match: 'Joy',                    name: 'pro',                    id: 'com.indiegoodies.Agile.lifetime2',                          type: 'lifetime',     strict: false, verified: false },
        { match: 'kiddztube',              name: 'Subscriber',             id: 'kidsbeetv.lifetime.subscription.ios',                       type: 'lifetime',     strict: false, verified: false },
        { match: 'knowme-storage',         name: 'pro',                    id: 'pro',                                                       type: 'lifetime',     strict: false, verified: false },
        { match: 'Kylin',                  name: 'pro',                    id: 'pro_life',                                                  type: 'lifetime',     strict: false, verified: false },
        { match: 'Langster',               name: 'Premium',                id: 'com.langster.universal.lifetime',                           type: 'lifetime',     strict: false, verified: false },
        { match: 'Language Learning',      name: 'premium',                id: 'language_sub_lifetime',                                     type: 'lifetime',     strict: false, verified: false },
        { match: 'LaunchX',                name: 'Pro',                    id: 'com.launcherx.Lifetime',                                    type: 'lifetime',     strict: false, verified: false },
        { match: 'Ledger',                 name: 'Pro',                    id: 'com.lifetimeFamily.pro',                                    type: 'lifetime',     strict: false, verified: false },
        { match: 'Leica LUX',              name: 'pro',                    id: 'annual_subscribers_first_cohort',                           type: 'subscription', strict: false, verified: false },
        { match: 'LemonKeepAccounts',      name: 'VIP',                    id: 'lm_1_1month',                                               type: 'subscription', strict: false, verified: false },
        { match: 'Liftbear',               name: 'Pro',                    id: 'liftbear_2399_1y',                                          type: 'subscription', strict: false, verified: false },
        { match: 'Lightune',               name: 'pro',                    id: 'Lightune_Pro_Year',                                         type: 'subscription', strict: false, verified: false },
        { match: 'Linearity Curve',        name: 'pro',                    id: 'linearity_curve_pro_yearly_free_trial',                     type: 'subscription', strict: false, verified: false },
        { match: 'Linger',                 name: 'Pro access',             id: 'linger_lifetime_standard',                                  type: 'lifetime',     strict: false, verified: false },
        { match: 'Lito',                   name: 'LitoPlus',               id: 'ml_lifetime_0499',                                          type: 'lifetime',     strict: false, verified: false },
        { match: 'LiveCaption',            name: 'Plus',                   id: 'rc_0400_1m',                                                type: 'subscription', strict: false, verified: false },
        { match: 'LiveWallpaper',          name: 'Pro access',             id: 'com.tech.LiveWallpaper.ALL',                                type: 'lifetime',     strict: false, verified: false },
        { match: 'Loopsie',                name: 'pro-iOS',                id: 'com.gamelounge.loopsie.ios.one_time_l',                     type: 'lifetime',     strict: false, verified: false },
        { match: 'LUTCamera',              name: 'ProVersionLifeTime',     id: 'com.uzero.funforcam.lifetimepurchase',                      type: 'lifetime',     strict: false, verified: false },
        { match: 'MagicTiles3',            name: 'VIP',                    id: 'com.pianoidols.vipsub.year.06',                             type: 'subscription', strict: false, verified: false },
        { match: 'maple_mobile',           name: 'premium',                id: 'mc_3000_12m',                                               type: 'subscription', strict: false, verified: false },
        { match: 'MatrixClock',            name: 'Premium',                id: 'com.lishaohui.matrixclock.lifetimesharing',                 type: 'lifetime',     strict: false, verified: false },
        { match: 'Meal Planner',           name: 'premium',                id: 'mp_1999_lifetime',                                          type: 'lifetime',     strict: false, verified: false },
        { match: 'Medication List',        name: 'Premium',                id: 'ml_lifetime',                                               type: 'lifetime',     strict: false, verified: false },
        { match: 'MemeLoop',               name: 'pro',                    id: 'com.ai.gif.lifetime.pro',                                   type: 'lifetime',     strict: false, verified: false },
        { match: 'metaslip',               name: 'Pro',                    id: 'ms_lifetime',                                               type: 'lifetime',     strict: false, verified: false },
        { match: 'MinimalDiary',           name: 'pro',                    id: 'com.mad.MinimalDiary.lifetime',                             type: 'lifetime',     strict: false, verified: false },
        { match: 'mizframa',               name: 'premium',                id: 'mf_20_lifetime2',                                           type: 'lifetime',     strict: false, verified: false },
        { match: 'Mojo',                   name: 'pro_ai',                 id: 'video.mojo.pro.ai.yearly',                                  type: 'subscription', strict: false, verified: false },
        { match: 'money_manager',          name: 'premium',                id: 'com.happy.money.forever',                                   type: 'lifetime',     strict: false, verified: false },
        { match: 'MuCase',                 names: GUESS_NAMES,             id: 'mc_7200_lifetime_v1',                                       type: 'lifetime',     strict: false, verified: false },
        { match: 'multitimer_app',         name: 'premium',                id: 'timus_lt_base',                                             type: 'lifetime',     strict: false, verified: false },
        { match: 'muoyu',                  name: 'pro',                    id: 'com.metaorder.muoyu.prolifetime.12',                        type: 'lifetime',     strict: false, verified: false },
        { match: 'MusicMate',              name: 'premium',                id: 'mm_lifetime_68_premium',                                    type: 'lifetime',     strict: false, verified: false },
        { match: 'My Diary',               name: 'Pro',                    id: 'com.simpleinnovation.diary.premium.forever.base',           type: 'lifetime',     strict: false, verified: false },
        { match: 'My Time',                name: 'Pro',                    id: 'ninja.fxc.mytime.pro.lifetime',                             type: 'lifetime',     strict: false, verified: false },
        { match: 'MyPianist',              name: 'pro',                    id: 'com.collaparte.mypianist.pro.yearly',                       type: 'subscription', strict: false, verified: false },
        { match: 'MyThings',               name: 'pro',                    id: 'xyz.jiaolong.MyThings.pro.infinity',                        type: 'lifetime',     strict: false, verified: false },
        { match: 'nbcamera',               name: 'patron',                 id: 'com.andyworks.camera.yearlyPatron',                         type: 'subscription', strict: false, verified: false },
        { match: 'NotePlan',               name: 'premium',                id: 'co.noteplan.subscription.personal.annual',                  type: 'subscription', strict: false, verified: false },
        { match: 'Noto 笔记',                name: 'pro',                    id: 'com.lkzhao.editor.full',                                    type: 'subscription', strict: false, verified: false },
        { match: 'nPtt',                   name: 'vip.yearly',             id: 'app.nextptt.vip1.yearly',                                   type: 'subscription', strict: false, verified: false },
        { match: 'ObjectRemoval',          name: 'Pro',                    id: 'ObjectRemoval.Lifetime',                                    type: 'lifetime',     strict: false, verified: false },
        { match: 'OffScreen',              name: 'Entitlement.Pro',        id: 'tech.miidii.offscreen.pro',                                 type: 'lifetime',     strict: false, verified: false },
        { match: 'One4WallSwiftUI',        name: 'lifetime',               id: 'lifetime_key',                                              type: 'lifetime',     strict: false, verified: false },
        { match: 'OneClear',               name: 'pro',                    id: 'app.imone.OneClear.Lifetime',                               type: 'lifetime',     strict: false, verified: false },
        { match: 'OneFlag',                name: 'pro',                    id: 'oneflag_lifetime',                                          type: 'lifetime',     strict: false, verified: false },
        { match: 'OneGrow',                name: 'pro',                    id: 'com.onenicetech.OneGrow.Lifetime',                          type: 'lifetime',     strict: false, verified: false },
        { match: 'OneMockup',              name: 'pro',                    id: 'online.ohwe.onescreen.Lifetime',                            type: 'lifetime',     strict: false, verified: false },
        { match: 'OneScreen',              name: 'pro',                    id: 'onescreen_lifetime',                                        type: 'lifetime',     strict: false, verified: false },
        { match: 'OneTap',                 name: 'pro',                    id: 'DiscountedProLifetime',                                     type: 'lifetime',     strict: false, verified: false },
        { match: 'OneTodo',                name: 'pro',                    id: 'onetodo_lifetime',                                          type: 'lifetime',     strict: false, verified: false },
        { match: 'OneWidget',              name: 'allaccess',              id: 'com.onewidget.vip',                                         type: 'lifetime',     strict: false, verified: false },
        { match: 'opusvpn',                name: 'pro',                    id: 'yearly_discount',                                           type: 'subscription', strict: false, verified: false },
        { match: 'Overdue',                name: 'Pro',                    id: '1',                                                         type: 'lifetime',     strict: false, verified: false },
        { match: 'owl_recorder',           name: 'lifetime',               id: 'company.thebrainstorming.owlrecorder.lifetime',             type: 'lifetime',     strict: false, verified: false },
        { match: 'Packr',                  name: 'Pro',                    id: 'com.jeremieleroy.packr.premiumyearly',                      type: 'subscription', strict: false, verified: false },
        { match: 'Pantry Check',           name: 'Premium',                id: 'pc_lifetime',                                               type: 'lifetime',     strict: false, verified: false },
        { match: 'Paper',                  name: 'pro',                    id: 'com.fiftythree.paper.credit',                               type: 'lifetime',     strict: false, verified: false },
        { match: 'PDF_convertor',          name: 'VIP',                    id: 'com.pdf.convertor.forever',                                 type: 'lifetime',     strict: false, verified: false },
        { match: 'pdfai_app',              name: 'premium',                id: 'special_lifetime',                                          type: 'lifetime',     strict: false, verified: false },
        { match: 'Percento',               name: 'premium',                id: 'app.percento.premium.168.lifetime',                         type: 'lifetime',     strict: false, verified: false },
        { match: 'Personal Best',          name: 'pro',                    id: 'PersonalBestPro_Yearly',                                    type: 'subscription', strict: false, verified: false },
        { match: 'Photo Cleaner',          name: 'premium',                id: 'com.monocraft.photocleaner.lifetime.3',                     type: 'lifetime',     strict: false, verified: false },
        { match: 'photography',            name: 'premium',                id: 'photography_sub_yearly_1',                                  type: 'subscription', strict: false, verified: false },
        { match: 'PhotoMapper',            name: 'premium',                id: 'photomapper_lifetime_1.99',                                 type: 'lifetime',     strict: false, verified: false },
        { match: 'Photon',                 name: 'photon.paid',            id: 'photon.paid.onetime',                                       type: 'lifetime',     strict: false, verified: false },
        { match: 'Photoooo',               name: 'lifetime',               id: 'canoe_28_rnb_forever',                                      type: 'lifetime',     strict: false, verified: false },
        { match: 'PhotoRoom',              name: 'pro',                    id: 'com.background.pro.yearly',                                 type: 'subscription', strict: false, verified: false },
        { match: 'PhotoVault',             name: 'lifetime',               id: 'photovault.lifetime',                                       type: 'lifetime',     strict: false, verified: false },
        { match: 'Phtoto Swiper',          name: 'pro',                    id: 'rc_499_life',                                               type: 'lifetime',     strict: false, verified: false },
        { match: 'PianoTrainer',           name: 'pro_subscription',       id: 'pianotrainer.sub.yearly.pro',                               type: 'subscription', strict: false, verified: false },
        { match: 'PicLoom',                names: GUESS_NAMES,             id: 'com.efsoft.picloom_nc_lifetime',                            type: 'lifetime',     strict: false, verified: false },
        { match: 'Pigment',                name: 'pro',                    id: 'com.pixite.pigment.1yearS',                                 type: 'subscription', strict: false, verified: false },
        { match: 'PinPaper',               name: 'allaccess',              id: 'Paper_Lifetime',                                            type: 'lifetime',     strict: false, verified: false },
        { match: 'Pins',                   name: 'customer',               id: 'do.anh.Pins.Unlock.Standard',                               type: 'subscription', strict: false, verified: false },
        { match: 'PipDoc',                 name: 'pro',                    id: 'pipdoc_pro_lifetime',                                       type: 'lifetime',     strict: false, verified: false },
        { match: 'PixelSensePocket',       name: 'pro',                    id: 'pixelsense_pocket_unlock_forever',                          type: 'lifetime',     strict: false, verified: false },
        { match: 'PixelStudio',            name: 'Pro',                    id: 'PixelNFT.Pro.Lifetime',                                     type: 'lifetime',     strict: false, verified: false },
        { match: 'PixImagine',             names: GUESS_NAMES,             id: 'com.efsoft.piximagine_nc_lifetime',                         type: 'lifetime',     strict: false, verified: false },
        { match: 'PM4',                    name: 'pro',                    id: 'pm4_pro_1y_2w0',                                            type: 'subscription', strict: false, verified: false },
        { match: 'powo',                   name: 'com.minardwu.powo_lifetime', id: 'com.minardwu.powo_lifetime',                                type: 'lifetime',     strict: false, verified: false },
        { match: 'PrivateBrowser',         name: 'pro',                    id: 'private_pro_lifetime',                                      type: 'lifetime',     strict: false, verified: false },
        { match: 'ProCam',                 name: 'pro',                    id: 'pro_lifetime',                                              type: 'lifetime',     strict: false, verified: false },
        { match: 'PwDrawingPad',           name: 'pro',                    id: 'com.s132.app.supaintexchange.year',                         type: 'subscription', strict: false, verified: false },
        { match: 'QingLong',               name: 'Premium',                id: 'qinglong_premium',                                          type: 'lifetime',     strict: false, verified: false },
        { match: 'ReadCopilot',            name: 'premium',                id: 'read_copilot_premium_yearly',                               type: 'subscription', strict: false, verified: false },
        { match: 'Readle',                 name: 'Premium',                id: 'com.hello.german.yearly',                                   type: 'subscription', strict: false, verified: false },
        { match: 'Rec',                    name: 'rec.paid',               id: 'rec.paid.onetime',                                          type: 'lifetime',     strict: false, verified: false },
        { match: 'Remote+',                name: 'Pro',                    id: 'com.cherpake.macrc.all',                                    type: 'lifetime',     strict: false, verified: false },
        { match: 'remoteMouse',            name: 'pro',                    id: 'Subscribe__RemoteMouse_Yearly',                             type: 'subscription', strict: false, verified: false },
        { match: 'Ricoh Recipes',          name: 'Patron',                 id: 'Ricoh_Patron',                                              type: 'subscription', strict: false, verified: false },
        { match: 'Rootd',                  name: 'pro',                    id: 'subscription_lifetime',                                     type: 'lifetime',     strict: false, verified: false },
        { match: 'RoundedCorner',          name: 'pro',                    id: 'com.smallCorner.lifetime',                                  type: 'lifetime',     strict: false, verified: false },
        { match: 'Saifs Ai',               name: 'lifetime',               id: 'ai_clothes_changer_lifetime_offer',                         type: 'lifetime',     strict: false, verified: false },
        { match: 'SalesCat',               name: 'Premium',                id: 'com.lishaohui.salescat.lifetime',                           type: 'lifetime',     strict: false, verified: false },
        { match: 'scanbatch',              name: 'Pro',                    id: 'scanbatch.lifetime',                                        type: 'lifetime',     strict: false, verified: false },
        { match: 'ScannerPro',             name: 'plus',                   id: 'com.ddm1024.premium.yearly',                                type: 'subscription', strict: false, verified: false },
        { match: 'Scelta',                 name: 'pro',                    id: 'SceltaProLifetime',                                         type: 'lifetime',     strict: false, verified: false },
        { match: 'ScreenMaker',            name: 'pro',                    id: 'snapApp_pro_lifetime',                                      type: 'lifetime',     strict: false, verified: false },
        { match: 'ScreenRecordCase',       name: 'Premium',                id: 'me.fandong.ScreenRecordCase.Ultra',                         type: 'lifetime',     strict: false, verified: false },
        { match: 'Sculpt Log',             name: 'pro',                    id: 'com.suxuanlv.sculptic.pro.lifetime',                        type: 'lifetime',     strict: false, verified: false },
        { match: 'server_bee',             name: 'Pro',                    id: 'pro_45_lifetime',                                           type: 'lifetime',     strict: false, verified: false },
        { match: 'Shapy',                  name: 'premium',                id: 'com.blake.femalefitness.subscription.yearly',               type: 'subscription', strict: false, verified: false },
        { match: 'Shared Family Shopping List', name: 'premium',                id: 'ls_1299_lifetime',                                          type: 'lifetime',     strict: false, verified: false },
        { match: 'SharkSMS',               name: 'VIP',                    id: 'com.gaapp.sms.permanently',                                 type: 'lifetime',     strict: false, verified: false },
        { match: 'Short Menu',             name: 'pro',                    id: 'com.appiculous.shortmenuios.pro.annual',                    type: 'subscription', strict: false, verified: false },
        { match: 'simple-timer',           name: 'patron',                 id: 'com.andyworks.weather.yearlyPatron',                        type: 'subscription', strict: false, verified: false },
        { match: 'simple-weather',         name: 'patron',                 id: 'com.andyworks.weather.yearlyPatron',                        type: 'subscription', strict: false, verified: false },
        { match: 'SleepDown',              name: 'Pro',                    id: 'pro_student_0926',                                          type: 'lifetime',     strict: false, verified: false },
        { match: 'SleepSounds',            name: 'vip',                    id: 'VIPOneMonth',                                               type: 'subscription', strict: false, verified: false },
        { match: 'SLPDFMaker',             name: 'pro',                    id: 'com.pdfstudio.lifetime.pro',                                type: 'lifetime',     strict: false, verified: false },
        { match: 'SmartAIChat',            name: 'Premium',                id: 'sc_3999_1y',                                                type: 'subscription', strict: false, verified: false },
        { match: 'smscat',                 name: 'pro',                    id: 'smscat_vip_lifetime',                                       type: 'lifetime',     strict: false, verified: false },
        { match: 'SnapWords',              name: 'Pro access',             id: 'com.happyplan.snapwords.premium.subscription.yearly',       type: 'subscription', strict: false, verified: false },
        { match: 'Spark',                  name: 'premium',                id: 'spark_6999_1y_1w0',                                         type: 'subscription', strict: false, verified: false },
        { match: 'StarDiary',              name: 'pro',                    id: 'com.gsdyx.StarDiary.nonConsumable.forever',                 type: 'lifetime',     strict: false, verified: false },
        { match: 'StarFocus',              name: 'pro',                    id: 'com.gsdyx.StarFocus.nonConsumable.forever',                 type: 'lifetime',     strict: false, verified: false },
        { match: 'Startodo',               name: 'pro',                    id: 'pro_lifetime',                                              type: 'lifetime',     strict: false, verified: false },
        { match: 'StayOff',                name: 'Plus',                   id: 'so_lt_1299',                                                type: 'lifetime',     strict: false, verified: false },
        { match: 'StockPlus',              name: 'Premium',                id: 'stocks_lifetime_premium',                                   type: 'lifetime',     strict: false, verified: false },
        { match: 'Storage Cleaner',        name: 'Premium',                id: 'storagecleaner_standalone_lifetime_free',                   type: 'lifetime',     strict: false, verified: false },
        { match: 'streaks',                name: 'patron',                 id: 'com.andyworks.weather.yearlyPatron',                        type: 'subscription', strict: false, verified: false },
        { match: 'StudyAI',                name: 'premium_access',         id: 'Lifetime_PRO',                                              type: 'lifetime',     strict: false, verified: false },
        { match: 'stufflog',               name: 'pro_access',             id: 'com.dyl.thinglog.lifetime',                                 type: 'lifetime',     strict: false, verified: false },
        { match: 'Subtrack',               name: 'pro',                    id: 'com.mohitnandwani.subtrack.subtrackpro.family',             type: 'lifetime',     strict: false, verified: false },
        { match: 'SwimApp',                name: 'pro_access',             id: 'com.dyl.swimnote.lifetime',                                 type: 'lifetime',     strict: false, verified: false },
        { match: 'Taio',                   name: 'full-version',           id: 'taio_1651_1y_2w0_std_v2',                                   type: 'subscription', strict: false, verified: false },
        { match: 'Tangerine',              name: 'Premium',                id: 'PremiumMonthly',                                            type: 'subscription', strict: false, verified: false },
        { match: 'TeleprompterX',          name: 'Pro Upgrade',            id: 'TPXOTP',                                                    type: 'lifetime',     strict: false, verified: false },
        { match: 'tetrify',                name: 'pro',                    id: 'pro_early_lifetime',                                        type: 'lifetime',     strict: false, verified: false },
        { match: 'TextMask',               name: 'pro',                    id: 'tm_lifetime',                                               type: 'lifetime',     strict: false, verified: false },
        { match: 'Thiro',                  name: 'pro',                    id: 'atelerix_pro_lifetime',                                     type: 'lifetime',     strict: false, verified: false },
        { match: 'TimeFinder',             name: 'pro',                    id: 'com.lukememet.TimeFinder.Premium',                          type: 'lifetime',     strict: false, verified: false },
        { match: 'totowallet',             name: 'all',                    id: 'com.ziheng.totowallet.onetimepurchase',                     type: 'lifetime',     strict: false, verified: false },
        { match: 'Tracepad-iOS',           name: 'unlock',                 id: 'tracepad_unlock_all_gesture_5',                             type: 'lifetime',     strict: false, verified: false },
        { match: 'Transfer',               name: 'pro',                    id: 'transfer_ios_premium_year_2022_1',                          type: 'subscription', strict: false, verified: false },
        { match: 'Translate - Talk Translator', name: 'Premium',                id: 'premiumAnnually',                                           type: 'subscription', strict: false, verified: false },
        { match: 'transmission_ui',        name: 'Premium',                id: '200002',                                                    type: 'subscription', strict: false, verified: false },
        { match: 'TripMemo',               name: 'pro',                    id: 'com.ningle.dailytracker.lifetime',                          type: 'lifetime',     strict: false, verified: false },
        { match: 'TruthOrDare',            name: 'premium',                id: 'truth_or_dare_premium_monthly',                             type: 'subscription', strict: false, verified: false },
        { match: 'TuneTally',              name: 'Pro',                    id: 'tunetally_pro',                                             type: 'lifetime',     strict: false, verified: false },
        { match: 'UTC',                    name: 'Entitlement.Pro',        id: 'tech.miidii.MDClock.subscription.month',                    type: 'subscription', strict: false, verified: false },
        { match: 'Utiful',                 name: 'All Access',             id: 'All_Access_YR_12M_Free',                                    type: 'lifetime',     strict: false, verified: false },
        { match: 'VHSCamera',              name: 'pro',                    id: 'vhscam_pro_lifetime',                                       type: 'lifetime',     strict: false, verified: false },
        { match: 'vibes',                  name: 'patron',                 id: 'com.andyworks.vibes.yearlyPatron',                          type: 'subscription', strict: false, verified: false },
        { match: 'WallShift',              name: 'pro',                    id: 'com.roadesign.WallShift.Lifetime',                          type: 'lifetime',     strict: false, verified: false },
        { match: 'Watchly',                name: 'lifetime',               id: 'watchface.lifetime',                                        type: 'lifetime',     strict: false, verified: false },
        { match: 'WeNote',                 name: 'pro',                    id: 'Yearly',                                                    type: 'subscription', strict: false, verified: false },
        { match: 'WhiteCloud',             name: 'allaccess',              id: 'wc_pro_1y',                                                 type: 'subscription', strict: false, verified: false },
        { match: 'widget_art',             name: 'all',                    id: 'com.ziheng.widgetart.onetime',                              type: 'lifetime',     strict: false, verified: false },
        { match: 'WidgetSmith',            name: 'Premium',                id: 'PremiumMonthlyWidgetsmith',                                 type: 'subscription', strict: false, verified: false },
        { match: 'wordswag',               name: 'pro',                    id: 'Pro_Launch_Monthly',                                        type: 'subscription', strict: false, verified: false },
        { match: 'Wozi',                   name: 'wozi_pro_2023',          id: 'wozi_pro_2023',                                             type: 'lifetime',     strict: false, verified: false },
        { match: 'YiKe',                   name: 'YiKe - Light Journaling Pro', id: 'yike_pro',                                                  type: 'lifetime',     strict: false, verified: false },
        { match: 'Yosum',                  name: 'Premium',                id: 'yosum_999_1year',                                           type: 'subscription', strict: false, verified: false },
        { match: 'YubePiP',                name: 'pro',                    id: 'piptube_pro_lifetime',                                      type: 'lifetime',     strict: false, verified: false },
        { match: 'Yummi',                  name: 'Pro',                    id: 'ym_lifetime_4.99',                                          type: 'lifetime',     strict: false, verified: false },
        { match: 'Zen Flip Clock',         name: 'pro',                    id: 'com.mad.zenflipclock.iap.buymeacoffee',                     type: 'lifetime',     strict: false, verified: false },
        { match: '事线',                     name: 'pro',                    id: 'xyz.jiaolong.eventline.pro.lifetime',                       type: 'lifetime',     strict: false, verified: false },
        { match: '人生清单',                   name: 'premium',                id: 'com.metaorder.lifelist.premium',                            type: 'lifetime',     strict: false, verified: false },
        { match: '信息计算',                   name: 'pro',                    id: 'informaticcalculations.pro.lifetime',                       type: 'lifetime',     strict: false, verified: false },
        { match: '凹凸啦查妆',                  name: 'Pro access',             id: 'com.smartitfarmer.MakeUpAssistant.UNLIMITED',               type: 'lifetime',     strict: false, verified: false },
        { match: '喵组件',                    name: 'MiaoWidgetPro',          id: 'MiaoLifeTime',                                              type: 'lifetime',     strict: false, verified: false },
        { match: '手持弹幕',                   name: 'Pro access',             id: 'com.tech.LedScreen.VIPALL',                                 type: 'lifetime',     strict: false, verified: false },
        { match: '时间记录',                   name: 'pro',                    id: 'com.bapaws.Hours.lifetime',                                 type: 'lifetime',     strict: false, verified: false },
        { match: '目标地图',                   name: 'pro',                    id: 'com.happydogteam.relax.lifetimePro',                        type: 'lifetime',     strict: false, verified: false },
        { match: '秩序时钟',                   name: 'lifetime',               id: 'com.metaorder.orderclocko.lifetime',                        type: 'lifetime',     strict: false, verified: false },
        { match: '秩序目标',                   name: 'pro',                    id: 'com.metaorder.OKRTomato.vip.supremacy',                     type: 'lifetime',     strict: false, verified: false },
        { match: '美妆日历',                   name: 'Pro access',             id: 'com.tech.Aula.VIPALL',                                      type: 'lifetime',     strict: false, verified: false },
        { match: '翻页时钟',                   name: 'Pro access',             id: 'com.douwan.aiclock.ALL',                                    type: 'lifetime',     strict: false, verified: false },
        { match: '萌客AI绘画',                 name: 'AISticker_VIP',          id: 'LifetimeSubscription_Sticker',                              type: 'lifetime',     strict: false, verified: false },
        { match: '语音计算器',                  name: 'Pro access',             id: 'com.tech.counter.All',                                      type: 'lifetime',     strict: false, verified: false },
        { match: '谜底时钟',                   name: 'Entitlement.Pro',        id: 'tech.miidii.MDClock.pro',                                   type: 'lifetime',     strict: false, verified: false },
        { match: '谜底黑胶',                   name: 'Entitlement.Pro',        id: 'tech.miidii.MDVinyl.lifetime',                              type: 'lifetime',     strict: false, verified: false },
        { match: '资源搬运大师',                 name: 'SaveTikYoutu_common',    id: 'LifetimeSubscription',                                      type: 'lifetime',     strict: false, verified: false },
        { match: '车票票',                    name: 'vip+watch_vip',          id: 'eticket_with_watch_life_a',                                 type: 'lifetime',     strict: false, verified: false }
    ];

    // 正则元字符转义；strict 模式加词边界，避免 'Law' 误杀 'Flawless'
    // P2#9：\b 只对 ASCII 词字符生效，中文 key 上 strict 等于失效；改为手动边界检查
    // 词字符 = ASCII 字母数字下划线 + CJK（汉字 \u4e00-\u9fff、扩展 \u3400-\u4dbf、
    // 日文假名 \u3040-\u30ff、韩文 \uac00-\ud7a3）；前后都不是词字符（或串首/串尾）才算命中
    const isWordChar = (ch) => /[A-Za-z0-9_]/.test(ch)
        || (ch >= '\u4e00' && ch <= '\u9fff') || (ch >= '\u3400' && ch <= '\u4dbf')
        || (ch >= '\u3040' && ch <= '\u30ff') || (ch >= '\uac00' && ch <= '\ud7a3');
    const safeTest = (pattern, text, strict) => {
        if (!text) return false;
        const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (!strict) return new RegExp(escaped, 'i').test(text);
        const re = new RegExp(escaped, 'gi');
        let m;
        while ((m = re.exec(text)) !== null) {
            const before = m.index > 0 ? text[m.index - 1] : '';
            const after = m.index + m[0].length < text.length ? text[m.index + m[0].length] : '';
            if (!isWordChar(before) && !isWordChar(after)) return true;
            if (m[0].length === 0) re.lastIndex++; // 防御零长匹配死循环（规则 match 均非空）
        }
        return false;
    };

    // 两轮匹配（Gemini 审查 2-1/3-2）：BID 优先于 UA，消除宽松 UA 关键词抢占。
    // 第一轮只测含点号的规则（Bundle ID 型）对 lowerBID；第二轮只测不含点号的
    // 规则（App 名型）对 lowerUA。例外：'col.or' 与 'timetrack.io' 来自 Reheji
    // listua 区（UA 型）却含点号，分不干净，第一轮对 UA 与 BID 都测，保留旧行为。
    let rule = null;
    const isBidRule = (r) => r.match.indexOf('.') !== -1;
    const AMBIGUOUS_DOT_RULES = new Set(['col.or', 'timetrack.io']);
    for (const r of MappingRules) {
        if (!isBidRule(r)) continue;
        if (AMBIGUOUS_DOT_RULES.has(r.match.toLowerCase())) {
            if (safeTest(r.match, lowerUA, r.strict) || safeTest(r.match, lowerBID, r.strict)) { rule = r; break; }
        } else if (safeTest(r.match, lowerBID, r.strict)) {
            rule = r;
            break;
        }
    }
    if (!rule) {
        for (const r of MappingRules) {
            if (isBidRule(r)) continue;
            if (safeTest(r.match, lowerUA, r.strict)) { rule = r; break; }
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
        // C9 断言：订阅 expires_date 必须为 2099-12-31（只校验本次注入的项，不动真实记录）
        const s = sub.subscriptions[productId];
        if (s && s.expires_date !== FAKE_EXPIRES) {
            console.log(`[RC] C9 断言：订阅 ${productId} expires_date 非 2099，已强制改回`);
            s.expires_date = FAKE_EXPIRES;
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
                // P1#5：官方 EntitlementInfo 与 non_subscriptions 字段表均无 price/display_name，
                // 本轮曾按 Reheji 做法补过，已删掉（SDK 解码时会忽略未知字段，删掉更干净）
            };
        }
        const list = sub.non_subscriptions[productId] || [];
        // 去重：已有真实购买记录时不追加
        if (list.length === 0) {
            // 模拟交易号（Gemini 审查 2-4/3-4）：官方 schema 里 non_subscriptions
            // 条目的 id 是交易唯一标识（如 o1_1234567890），不是 productId；
            // store_transaction_id 取时间戳后 10 位数字串，id 为 "o1_" + 该串
            const txn = String(Date.now()).slice(-10);
            list.push({
                "id": "o1_" + txn,
                "store_transaction_id": txn,
                "is_sandbox": false,
                "purchase_date": nowStr,
                "original_purchase_date": origStr,
                "store": "app_store"
            });
        }
        sub.non_subscriptions[productId] = list;
        // C9 断言：终身权益 expires_date 必须为 null（只校验本次注入的项，不动真实记录）
        for (const n of entNames) {
            const e = sub.entitlements[n];
            if (e && e.expires_date !== null) {
                console.log(`[RC] C9 断言：终身权益 ${n} expires_date 非 null，已强制改回 null`);
                e.expires_date = null;
            }
        }
    };

    let matchedAppKey, targetId;
    // C1：注入来源标记（日志用）：'exact' 精确规则 / 'offerings' 真实 offerings / 'blind' 单名盲猜
    let injectSource = 'blind';
    // P1#6：offerings 路径本次注入的实际类型（lifetime/subscription），通知文案用
    let injectedOfferingsType = null;
    // 本次注入的 entitlement 名（日志用）：精确规则取 rule.names/name，offerings 取候选名组，盲猜取单名
    let injectedEntNames = [];
    // $done 只调用一次的守卫（异步 offerings 回调与超时可能竞态）
    let doneCalled = false;
    const doneOnce = (arg) => { if (!doneCalled) { doneCalled = true; $done(arg); } };

    // C3：注入/刷新后统一重算派生一致性字段（与 entitlements/subscriptions 保持一致）
    const recomputeDerivedFields = () => {
        const subIds = Object.keys(sub.subscriptions);
        const nonSubIds = Object.keys(sub.non_subscriptions);
        // latest_expiration_date：全部订阅中最晚的 expires_date；全终身（无订阅）时为 null
        let latest = null;
        let latestDate = null; // P1#7：latest 的 Date 形式，用于 Date 比较
        const allExp = {};
        const allPur = {};
        const allPurchased = [];
        const activeSubs = [];
        for (const pid of subIds) {
            const cur = sub.subscriptions[pid] || {};
            if (cur.expires_date) {
                allExp[pid] = cur.expires_date;
                // P1#7：ISO 字符串比较改 Date 比较，解析失败（NaN）跳过不参与
                const expDate = new Date(cur.expires_date);
                if (!isNaN(expDate.getTime())) {
                    if (!latestDate || expDate > latestDate) { latestDate = expDate; latest = cur.expires_date; }
                    if (expDate > now) activeSubs.push(pid);
                }
            }
            if (cur.purchase_date) allPur[pid] = cur.purchase_date;
            if (allPurchased.indexOf(pid) < 0) allPurchased.push(pid);
        }
        for (const pid of nonSubIds) {
            const list = sub.non_subscriptions[pid] || [];
            for (const e of list) {
                if (e && e.purchase_date && !allPur[pid]) allPur[pid] = e.purchase_date;
            }
            // 终身产品无到期日，按官方语义记 null
            if (!(pid in allExp)) allExp[pid] = null;
            if (allPurchased.indexOf(pid) < 0) allPurchased.push(pid);
        }
        sub.latest_expiration_date = latest;
        sub.all_expiration_dates_by_product = allExp;
        sub.all_purchase_dates_by_product = allPur;
        sub.all_purchased_product_identifiers = allPurchased;
        sub.active_subscriptions = activeSubs;
        // request_date 是服务端取数时间，SDK 用它与 expires_date 比较判 isActive：保留原值，缺失才补
        if (!sub.request_date) sub.request_date = nowStr;
        // management_url 已在结构补全时默认给 App Store 链接，此处不重复处理
    };

    // 收尾：按口径延期 → C3 重算 → 通知节流 → 日志 → $done（只调用一次）
    const finalizeInjection = () => {
        // 按口径延期现存未过期的 entitlement / subscription（Gemini 审查 2-2/3-3）：
        // 已过期且非本次注入目标的保持原状，不合并模板、不改过期时间；把其余项的
        // "已失效信号"（will_renew=false、unsubscribe_detected_at、
        // billing_issues_detected_at、is_sandbox=true 等）统一刷成正常订阅状态，
        // 只保留真实购买时间与 product_identifier。
        // 注意展开顺序：真实值在前、模板在后，否则真实值会把模板盖掉（2026-10-15 审查发现）。
        // 终身（expires_date 为 null，含刚注入的 lifetime 与用户真实买断）保持 null。
        for (const name of Object.keys(sub.entitlements)) {
            const cur = sub.entitlements[name] || {};
            const isLifetime = cur.expires_date === null || cur.expires_date === undefined;
            // 已过期的非终身权益不延期：解析失败或无过期时间按未过期处理
            if (!isLifetime) {
                const expDate = new Date(cur.expires_date);
                if (!isNaN(expDate.getTime()) && expDate <= now) continue;
            }
            sub.entitlements[name] = {
                ...cur,
                ...(isLifetime ? baseEntitlementLifetime : baseEntitlementSub),
                "expires_date": isLifetime ? null : FAKE_EXPIRES,
                "grace_period_expires_date": null,
                "purchase_date": cur.purchase_date || nowStr,
                // P0#2：去掉 || targetId 兜底——injectLifetime/injectSubscription 已给注入项
                // 写死 product_identifier；无 product_identifier 的真实 entitlement 不伪造，
                // 缺失时 JSON.stringify 会自动去掉 undefined 键
                "product_identifier": cur.product_identifier
            };
        }
        for (const pid of Object.keys(sub.subscriptions)) {
            const cur = sub.subscriptions[pid] || {};
            // 只延 targetId 或未过期订阅：已过期且非本次注入目标的原样不动，
            // 不合并模板、不改过期时间；解析失败或无过期时间按未过期处理
            // （宁可多延，不可误删）
            if (pid !== targetId) {
                const expDate = new Date(cur.expires_date);
                if (!isNaN(expDate.getTime()) && expDate <= now) continue;
            }
            sub.subscriptions[pid] = {
                ...cur,
                ...baseSubscription,
                "expires_date": FAKE_EXPIRES,
                "original_purchase_date": cur.original_purchase_date || origStr,
                "purchase_date": cur.purchase_date || nowStr
            };
        }
        // C3：重算派生一致性字段
        recomputeDerivedFields();

        // 通知节流：只在精确命中时发送，盲猜/offerings 不再误报。
        // key 用 v2 命名空间，与旧版脚本的节流记录隔离，避免旧记录导致长期不通知。
        if (rule) {
            const cleanKey = rule.match.replace(/[^a-zA-Z0-9_-]/g, '_');
            const storageKey = `rc_notify_v2_${cleanKey}`;
            const lastNotify = $.getdata(storageKey) || 0;
            const hoursSince = (Date.now() - (parseInt(lastNotify, 10) || 0)) / 36e5;
            if (hoursSince >= NOTIFY_INTERVAL_HOURS) {
                if (rule.verified === false) {
                    // 未核实规则：名字/product 来自上游表，未用真实响应核实，App 未必认；
                    // 不写“已安全注入”，改发候选权益名 + 待 App 确认（与 offerings 通知同款文案）
                    $.notify(`🎉 ${rule.match} 授权更新`, `已注入${rule.type === 'lifetime' ? '终身' : '永久'}候选权益名`, rule.type === 'lifetime' ? `待 App 确认 · 终身有效` : `待 App 确认 · 有效期至：2099-12-31`);
                } else {
                    $.notify(`🎉 ${rule.match} 授权更新`, `已安全注入${rule.type === 'lifetime' ? '终身' : '永久'}凭证`, rule.type === 'lifetime' ? `终身有效` : `有效期至：2099-12-31`);
                }
                $.setdata(Date.now().toString(), storageKey);
                console.log(`[RC] 已发送通知: ${storageKey}`);
            } else {
                console.log(`[RC] 通知节流中，跳过 (距上次 ${hoursSince.toFixed(1)}h，阈值 ${NOTIFY_INTERVAL_HOURS}h): ${storageKey}`);
            }
        }

        // P1#6：offerings 属“半精确”，注入成功时也可通知（开关 OFFERINGS_NOTIFY）；
        // 单独节流 key（rc_notify_v2_off_<App>），与精确规则的 key 隔离，同样 12 小时节流；
        // 文案按本次注入的实际类型（injectedOfferingsType）区分终身/订阅；
        // 文案标明是“候选权益名”（名字是推导的，App 未必认），不写“已安全注入”
        if (!rule && injectSource === 'offerings' && OFFERINGS_NOTIFY) {
            const cleanKey = (matchedAppKey || 'App').replace(/[^a-zA-Z0-9_-]/g, '_');
            const storageKey = `rc_notify_v2_off_${cleanKey}`;
            const lastNotify = $.getdata(storageKey) || 0;
            const hoursSince = (Date.now() - (parseInt(lastNotify, 10) || 0)) / 36e5;
            if (hoursSince >= NOTIFY_INTERVAL_HOURS) {
                $.notify(`🎉 ${matchedAppKey} 授权更新`, `已注入${injectedOfferingsType === 'lifetime' ? '终身' : '永久'}候选权益名`, injectedOfferingsType === 'lifetime' ? `待 App 确认 · 终身有效` : `待 App 确认 · 有效期至：2099-12-31`);
                $.setdata(Date.now().toString(), storageKey);
                console.log(`[RC] 已发送通知（offerings）: ${storageKey}`);
            } else {
                console.log(`[RC] 通知节流中（offerings），跳过 (距上次 ${hoursSince.toFixed(1)}h，阈值 ${NOTIFY_INTERVAL_HOURS}h): ${storageKey}`);
            }
        }

        const tag = rule ? ` [精确/${rule.type}]` : (injectSource === 'offerings' ? ' [offerings]' : ' [盲猜]');
        console.log(`[RC] 注入完成: ${matchedAppKey} (${targetId}) [${injectedEntNames.join(', ')}]${tag}`);
        doneOnce({ body: JSON.stringify(obj) });
    };

    // C1 单名盲猜回退（行为变更：不再注入全部通用名，只注入一个最可能的权益名）
    const injectBlindGuess = () => {
        // BID 取最后一段，但过滤纯顶级域名（如 thirteendoots.kelo.com -> com），此时改用 UA 的 App 名
        const TLD = new Set(['com', 'net', 'org', 'io', 'app', 'dev', 'me', 'co', 'cn']);
        let keyFromBid = BID ? BID.split('.').pop() : '';
        if (TLD.has(keyFromBid.toLowerCase())) keyFromBid = '';
        matchedAppKey = keyFromBid || ((rawUA.split('/')[0] || "App").split(' ')[0]);
        targetId = BID ? `${BID}.subscription` : `com.${matchedAppKey.toLowerCase()}.subscription`;
        const singleName = pickSingleGuessName(BID);
        injectedEntNames = [singleName];
        injectSource = 'blind';
        console.log(`[RC] 盲猜回退：单名注入 ${singleName}（${targetId}）`);
        injectSubscription(targetId, [singleName]);
    };

    if (rule) {
        // 精确命中：按 type 只写一边；entitlement 支持 names 数组（候选集，未核实）或单个 name；
        // names 双权益（nameb）同样走 names 数组（id 用主 id，idb 未保留）
        const entNames = rule.names || [rule.name];
        injectedEntNames = entNames;
        matchedAppKey = rule.match;
        targetId = rule.id;
        injectSource = 'exact';
        if (rule.type === 'lifetime') injectLifetime(rule.id, entNames);
        else injectSubscription(rule.id, entNames);
        finalizeInjection();
        return;
    }

    // C1：无本地规则 → 先试真实 offerings，再回退单名盲猜
    // 只对能取到 app_user_id 的 /v1/subscribers 请求做 offerings 请求；/v1/receipts 保持原行为
    const subMatch = ($request.url || '').match(/^(https?:\/\/[^\/]+)\/v1\/subscribers\/([^\/\?\s]+)/i);
    const hasFetchEngine = (typeof $task !== 'undefined' && $task && typeof $task.fetch === 'function')
        || (typeof $httpClient !== 'undefined' && $httpClient && typeof $httpClient.get === 'function')
        || (typeof $https !== 'undefined' && $https && typeof $https.get === 'function')
        || (typeof $http !== 'undefined' && $http && typeof $http.get === 'function');
    if (!subMatch || !hasFetchEngine) {
        if (!subMatch) console.log('[RC] 无 app_user_id（receipts 或非 subscribers 请求），跳过 offerings，直接盲猜');
        else console.log('[RC] 当前环境无可用 fetch 引擎，跳过 offerings，直接盲猜');
        injectBlindGuess();
        finalizeInjection();
        return;
    }
    // R3：URL 由 $request.url 正则重建，query string 被丢弃——RevenueCat 该接口不用 query，无影响（前提记录）
    const offeringsUrl = subMatch[1] + '/v1/subscribers/' + subMatch[2] + '/offerings';
    // 复用当前请求头（去掉条件缓存头，不硬编码任何 key）
    const offHeaders = {};
    for (const k of Object.keys(reqHeaders)) {
        const lk = k.toLowerCase();
        if (lk === 'if-none-match' || lk === 'if-modified-since' || lk === 'x-revenuecat-etag') continue;
        offHeaders[k] = reqHeaders[k];
    }
    let settled = false;
    let timer = null;
    const finishOfferings = (ok, offeringsBody) => {
        if (settled) return;
        settled = true;
        if (timer) { try { clearTimeout(timer); } catch (e) { /* 无定时器 */ } }
        if (ok && offeringsBody) {
            try {
                const offObj = JSON.parse(offeringsBody);
                const offerings = (offObj && offObj.offerings) || [];
                // P0#1：只注入一个最优包——收集全部 offering 的全部 package（记所属 offering 标识），
                // 先滤 trial/intro 包（全是 trial 才用 trial 包），再打分：lifetime=3、yearly/annual=2、
                // 其他=1，取最高分、平局取先遇到的一个；注入的产品只有一个（记录 44：候选名改从
                // 全部可用包各推一个，产品仍只注最优包）
                const allPkgs = [];
                for (const offering of offerings) {
                    const pkgs = (offering && offering.packages) || [];
                    for (const p of pkgs) allPkgs.push({ offeringId: offering.identifier, pkg: p });
                }
                const nonTrial = allPkgs.filter(({ pkg }) => !isTrialPackage(pkg.identifier, pkg.platform_product_identifier));
                const candidates = nonTrial.length ? nonTrial : allPkgs;
                // 消耗型商品不产生 entitlement，选包阶段直接排除（全是消耗型时 usable 为空 → best 仍为 null → 走盲猜回退）
                const usable = candidates.filter(({ pkg }) => !isConsumablePkg(pkg.platform_product_identifier));
                let best = null;
                let bestScore = -1;
                for (const { offeringId, pkg } of usable) {
                    const pid = pkg.platform_product_identifier;
                    if (!pid) continue;
                    const t = classifyProductType(pid, pkg.identifier);
                    let score = 1;
                    if (t === 'lifetime') score = 3;
                    else if (/yearly|annual/i.test(pid + ' ' + pkg.identifier)) score = 2;
                    if (score > bestScore) { bestScore = score; best = { offeringId, pkg }; }
                }
                if (best) {
                    const productId = best.pkg.platform_product_identifier;
                    // 候选名组（2026-11-18 用户拍板；记录 44 扩展）：offerings 路径从全部可用包各
                    // 推导一个名（最优包的在首位，去重，最多 4 个）+ token.pro 回退名，最多注 5 个名；
                    // 注入的产品仍只有最优包一个；盲猜路径仍只注单名（不动）
                    const derivedNames = [deriveEntitlementName(best.offeringId, best.pkg.identifier, productId, BID)];
                    for (const { offeringId, pkg } of usable) {
                        if (derivedNames.length >= 4) break;
                        if (!pkg.platform_product_identifier) continue;
                        const n = deriveEntitlementName(offeringId, pkg.identifier, pkg.platform_product_identifier, BID);
                        if (n && !derivedNames.includes(n)) derivedNames.push(n);
                    }
                    const guessName = pickSingleGuessName(BID);
                    const entNames = [...derivedNames];
                    if (!entNames.includes(guessName)) entNames.push(guessName);
                    injectedEntNames = entNames;
                    const type = classifyProductType(productId, best.pkg.identifier);
                    matchedAppKey = BID || ((rawUA.split('/')[0] || 'App').split(' ')[0]);
                    targetId = productId;
                    injectedOfferingsType = type;
                    injectSource = 'offerings';
                    if (type === 'lifetime') injectLifetime(productId, entNames);
                    else injectSubscription(productId, entNames);
                    console.log(`[RC] offerings 反推注入完成：选中 ${type} 包 ${productId}（${best.pkg.identifier}，${offeringsUrl}）`);
                    finalizeInjection();
                    return;
                }
                console.log('[RC] offerings 响应无可用 package，走盲猜回退');
            } catch (e) {
                console.log(`[RC] offerings 解析失败，走盲猜回退：${e.message}`);
            }
        } else {
            console.log('[RC] offerings 请求失败/超时，走盲猜回退');
        }
        injectBlindGuess();
        finalizeInjection();
    };
    // P0#3：无 setTimeout 的环境没有任何超时保护（httpGetJson 未给任何引擎传 timeout 参数），
    // QX 老版本异步请求无内置超时，卡住会 hang 住、$done 永不触发——直接放弃 offerings，走盲猜
    if (typeof setTimeout !== 'function') {
        console.log('[RC] 当前环境无 setTimeout，放弃 offerings，直接盲猜');
        injectBlindGuess();
        finalizeInjection();
        return;
    }
    try {
        timer = setTimeout(() => finishOfferings(false, null), OFFERINGS_TIMEOUT_MS);
    } catch (e) {
        console.log(`[RC] 定时器不可用，放弃 offerings，直接盲猜：${e.message}`);
        injectBlindGuess();
        finalizeInjection();
        return;
    }
    httpGetJson(offeringsUrl, offHeaders,
        (resp) => finishOfferings(true, resp.body),
        (err) => { console.log(`[RC] offerings 请求失败：${err}`); finishOfferings(false, null); });
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
