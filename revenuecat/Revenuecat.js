/*************************************
项目名称：RevenueCat 全能解锁 (2026 工业级重构版 · 修复版)
版本：2026-11-18 21:51（精简发布版）
规则：149 条精确规则（部分来自上游导入，标未核实）
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
    const joined = new Set();
    for (const q of raw) if (q.includes('_')) joined.add(q.toLowerCase());
    const isFragment = (f) => {
        for (const j of joined) if (j.length > f.length && j.includes(f)) return true;
        return false;
    };
    const parts = raw.join('.').split(/[._]/).filter(Boolean);
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
            && !bidTokens.has(lt) && !isBidLike(lt) && !isFragment(lt)) return t;
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
        EXCLUDE_UA_PREFIXES.some(prefix => {
            const esc = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            return new RegExp('^' + esc + '\\b').test(lowerUA) || lowerUA.includes('/' + prefix);
        });

    if (isExcluded) {
        console.log(`[RC] 命中排除名单，放行: BID=${BID}, UA=${rawUA}`);
        $done({});
        return;
    }
    // C6：forbiddenApps 命中即放行（UA / bundle / 请求体任一命中）
    const reqBodyStr = ($request && typeof $request.body === 'string') ? $request.body : '';
    const isForbidden = FORBIDDEN_APPS.some(a => {
        const la = a.toLowerCase();
        return lowerUA.includes(la) || lowerBID.includes(la) || reqBodyStr.toLowerCase().includes(la);
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
        { match: 'photon',        name: 'photon.paid',                                       id: 'photon.bundle.yearly',                      type: 'subscription', strict: false, verified: false },
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
        { match: 'markbuy',                      name: 'premium',                                id: 'com.markbuy.plus',                                 type: 'lifetime', strict: false }
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
        // 去重：已有真实购买记录时不追加（真实条目的 id 是交易号，不等于 product id，旧判据恒不成立）
        if (list.length === 0) {
            list.push({
                "id": productId,
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

    // 收尾：统一延期 → C3 重算 → 通知节流 → 日志 → $done（只调用一次）
    const finalizeInjection = () => {
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
                // P0#2：去掉 || targetId 兜底——injectLifetime/injectSubscription 已给注入项
                // 写死 product_identifier；无 product_identifier 的真实 entitlement 不伪造，
                // 缺失时 JSON.stringify 会自动去掉 undefined 键
                "product_identifier": cur.product_identifier
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
