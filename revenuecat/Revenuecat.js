/*************************************
项目名称：RevenueCat 全能解锁 (2026 工业级重构版)
核心改进：
1. 修复 non_subscriptions 结构与多产品合并逻辑
2. 采用增量安全注入，严格保留原有合法订阅与 store 属性
3. 补齐 SDK 强校验字段 (original_application_version 等)
4. 修复正则元字符逃逸、黑名单误杀与持久化 Key 异常
5. 增加调试日志输出，完善异常追踪
**************************************/

const $ = new Env("RevenueCat_Pro");
const NOTIFY_INTERVAL_HOURS = 12;

// 精准排除项 (全小写匹配，避免全局 substring 误杀)
const EXCLUDE_BUNDLE_IDS = [
    'com.crossutility.servercat',
    'com.kr328.clash',
    'zone.yiguo.flutter-rss-reader'
];
const EXCLUDE_UA_PREFIXES = [
    'lilyfm', 'servercat', 'eplayerx', 'authenticator', 
    'reflix', 'fileball', 'aptv', 'forward',  'flutter_rss_reader'
];

// --- 1. 请求阶段：安全破除缓存 ---
if (typeof $response === "undefined") {
    let headers = $request.headers || {};
    const deleteKeys = [
        'x-revenuecat-etag',
        'if-none-match',
        'if-modified-since',
        'x-revenuecat-last-receive-time'
    ];

    Object.keys(headers).forEach(k => {
        if (deleteKeys.includes(k.toLowerCase())) {
            delete headers[k];
        }
    });

    headers['Cache-Control'] = 'no-cache';
    headers['Pragma'] = 'no-cache';

    $done({ headers });
} else {
    // --- 2. 响应阶段：动态构建与安全注入 ---
    const headers = ($request && $request.headers) ? $request.headers : {};
    let rawUA = "";
    let BID = "";

    for (const [k, v] of Object.entries(headers)) {
        const lowerKey = k.toLowerCase();
        if (lowerKey === 'user-agent') rawUA = v;
        if (lowerKey === 'x-client-bundle-id') BID = v;
    }

    const lowerUA = rawUA.toLowerCase();
    const lowerBID = BID.toLowerCase();

    // 严谨黑名单检查 (避免 UA 包含 surge 等工具名字段被连带误杀)
    const isExcluded = EXCLUDE_BUNDLE_IDS.includes(lowerBID) || 
                       EXCLUDE_UA_PREFIXES.some(prefix => lowerUA.startsWith(prefix) || lowerUA.includes(`/${prefix}`));

    if (isExcluded) {
        console.log(`[RC] 命中排除名单: BID=${BID}, UA=${rawUA}`);
        $done({});
    } else {
        let obj = null;
        try {
            obj = JSON.parse($response.body);
        } catch (e) {
            console.log(`[RC] JSON 解析失败: ${e.message}，保持原始返回`);
            $done({});
        }

        if (!obj || !obj.subscriber) {
            console.log("[RC] 响应体中无 subscriber 对象，跳过修改");
            $done({});
        } else {
            const now = new Date();
            // 使用安全受支持的 ISO 时间，避免部分内核 2099 溢出
            const future = new Date(2098, 11, 31, 23, 59, 59);
            const originalPurchase = new Date(now.getTime() - 3 * 365 * 24 * 3600 * 1000);

            const formatDate = (d) => d.toISOString().replace(/\.\d{3}Z/, 'Z');
            const dateStr = formatDate(future);
            const nowStr = formatDate(now);
            const origStr = formatDate(originalPurchase);

            const basePlan = {
                "expires_date": dateStr,
                "original_purchase_date": origStr,
                "purchase_date": nowStr,
                "ownership_type": "PURCHASED",
                "store": "app_store",
                "is_sandbox": false,
                "will_renew": true,
                "period_type": "normal"
            };

            // 基础架构合规性补全
            obj.subscriber.subscriptions = obj.subscriber.subscriptions || {};
            obj.subscriber.entitlements = obj.subscriber.entitlements || {};
            obj.subscriber.non_subscriptions = obj.subscriber.non_subscriptions || {};
            obj.subscriber.original_application_version = obj.subscriber.original_application_version || "1.0";
            obj.subscriber.original_purchase_date = obj.subscriber.original_purchase_date || origStr;
            obj.subscriber.first_seen = obj.subscriber.first_seen || origStr;
            obj.subscriber.management_url = obj.subscriber.management_url || "https://apps.apple.com/account/subscriptions";

            // 精准映射配置列表 (数组保序，正则安全转义)
            const MappingRules = [
                { match: 'Sofa', name: 'super', id: 'sofa_family_29999_onetime' },
                { match: 'Welltory', name: 'pro', id: 'com.welltory.subscription.annual' },
                { match: 'CineDock', name: 'CineDock Pro', id: 'cn.ixiaoxiang.video.lifetime' },
                { match: 'FilmNoir', name: 'plus', id: 'app.filmnoir.appstore.purchases.lifetime' },
                { match: 'Photomator', name: 'pixelmator_photo_pro_access', id: 'pixelmator_photo_pro_subscription_v1_pro_offer' },
                { match: 'WaterMinder', name: 'waterminder-pro', id: 'waterminder.premiumYearly' },
                { match: 'Endel', name: 'pro', id: 'Lifetime' },
                { match: 'Gentler', name: 'premium', id: 'app.gentler.activity.nonconsumable.onetime1' },
                { match: 'Law', name: 'vip', id: 'LawVIPOneYear' },
                { match: 'Darkroom', name: 'co.bergen.Darkroom.entitlement.allToolsAndFilters', id: 'darkroom_gold_lifetime' },
                { match: 'AdGuard%20Home', name: 'aghrpro', id: 'adguard.home.remote.pro' },
                { match: 'Pillow', name: 'premium', id: 'com.neybox.pillow.premium.year' },
                { match: 'MoneyThings', name: 'Premium', id: 'com.lishaohui.cashflow.lifetime' },
                { match: 'Anybox', name: 'pro', id: 'cc.anybox.Anybox.annual' },
                { match: 'ShellBean', name: 'pro', id: 'com.ningle.shellbean.iap.forever' },
                { match: 'iplayTV', name: 'com.ll.btplayer.12', id: 'com.ll.btplayer.12' },
                { match: 'MOZE', name: 'premium', id: 'moze_pro_yearly' },
                { match: 'Vision', name: 'pro', id: 'com.vision.yearly_pro' },
                { match: 'Craft', name: 'pro', id: 'com.lukilabs.craft.pro.annual' },
                { match: 'Structured', name: 'pro', id: 'today.structured.pro' },
                { match: 'Figma', name: 'pro', id: 'com.figma.ios.pro' },
                { match: 'Slopes', name: 'pass', id: 'com.breakthrough.slopes.annual_pass' }
            ];

            let matchedAppKey = "";
            let targetId = "";
            let targetNames = [];

            // 安全转义字符匹配
            const safeTest = (pattern, text) => {
                if (!text) return false;
                const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                return new RegExp(escaped, 'i').test(text);
            };

            for (const rule of MappingRules) {
                if (safeTest(rule.match, lowerUA) || safeTest(rule.match, lowerBID)) {
                    matchedAppKey = rule.match;
                    targetId = rule.id;
                    targetNames = [rule.name];
                    break;
                }
            }

            // 智能盲猜逻辑
            if (!matchedAppKey) {
                matchedAppKey = BID ? BID.split('.').pop() : ((rawUA.split('/')[0] || "App").split(' ')[0]);
                targetId = BID ? `${BID}.lifetime` : `com.${matchedAppKey.toLowerCase()}.lifetime`;
                targetNames = ['pro', 'premium', 'plus', 'vip', 'all', 'gold', 'membership', 'advanced', 'lifetime', 'ultimate', 'super'];
            }

            // 1. 注入目标订阅
            obj.subscriber.subscriptions[targetId] = {
                ...(obj.subscriber.subscriptions[targetId] || {}),
                ...basePlan
            };

            // 2. 注入目标 Entitlements
            targetNames.forEach(name => {
                obj.subscriber.entitlements[name] = {
                    ...(obj.subscriber.entitlements[name] || {}),
                    ...basePlan,
                    "product_identifier": targetId
                };
            });

            // 3. 安全补全现有 Entitlements（仅延期，保留其原有 product_identifier 和 store 渠道）
            Object.keys(obj.subscriber.entitlements).forEach(name => {
                const currentEnt = obj.subscriber.entitlements[name];
                const existingPid = currentEnt.product_identifier || targetId;
                obj.subscriber.entitlements[name] = {
                    ...basePlan,
                    ...currentEnt,
                    "expires_date": dateStr,
                    "product_identifier": existingPid
                };
            });

            // 4. 安全补全现有 Subscriptions（保留原 store 等核心属性）
            Object.keys(obj.subscriber.subscriptions).forEach(id => {
                const currentSub = obj.subscriber.subscriptions[id];
                obj.subscriber.subscriptions[id] = {
                    ...basePlan,
                    ...currentSub,
                    "expires_date": dateStr
                };
            });

            // 5. 安全注入 non_subscriptions
            obj.subscriber.non_subscriptions[targetId] = obj.subscriber.non_subscriptions[targetId] || [];
            obj.subscriber.non_subscriptions[targetId].push({
                "id": targetId,
                "is_sandbox": false,
                "purchase_date": nowStr,
                "original_purchase_date": origStr,
                "store": "app_store"
            });

            // 6. 安全节流通知 (Key 做字符清洗，防止跨系统读写异常)
            const cleanKey = matchedAppKey.replace(/[^a-zA-Z0-9_-]/g, '_');
            const storageKey = `rc_notify_${cleanKey}`;
            const lastNotify = $.getdata(storageKey) || 0;

            if ((Date.now() - parseInt(lastNotify, 10)) / 36e5 >= NOTIFY_INTERVAL_HOURS) {
                $.notify(`🎉 ${matchedAppKey} 授权更新`, `已安全注入永久凭证`, `有效期至：2098-12-31`);
                $.setdata(Date.now().toString(), storageKey);
            }

            console.log(`[RC] 成功注入会员数据: ${matchedAppKey} (${targetId})`);
            $done({ body: JSON.stringify(obj) });
        }
    }
}

// Surge / 跨环境存储与通知兼容类
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
