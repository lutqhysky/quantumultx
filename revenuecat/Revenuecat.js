/*************************************
项目名称：RevenueCat 全能解锁 (2026 终极进化版)
脚本功能：
1. 【核心】强破 304 缓存：全量清理 ETag / Modified 头，强制 200 响应。
2. 【安全】动态时间伪造：原始购买时间动态回溯，规避 App 本地时间差风控审计。
3. 【深度】买断与订阅双注入：完美兼容永久买断制与订阅制 App。
4. 【扩充】大厂精准适配：新增、校准 2025-2026 最新流行 App 映射关系。
**************************************/

const $ = new Env("🎊 内购解锁成功");
const NOTIFY_INTERVAL_HOURS = 12; // 提高到 12 小时，减少通知打扰
const EXCLUDE_APPS = [
    'LilyFM/2','ServerCat','LilyFM','flutter_rss_reader','EplayerX',
    'Authenticator','Reflix', 'Fileball', 'APTV', 'Forward',
    'Shadowrocket', 'Quantumult', 'Surge', 'Stash', 'Loon' // 增加代理工具自身排除
]; 

// --- 1. 请求阶段：破除缓存，强制服务器返回 200 Body ---
if (typeof $response === "undefined") {
    let headers = $request.headers;
    const deleteHeaders = [
        'x-revenuecat-etag', 'X-RevenueCat-ETag', 
        'if-none-match', 'If-None-Match', 
        'if-modified-since', 'If-Modified-Since',
        'x-revenuecat-last-receive-time'
    ];
    
    deleteHeaders.forEach(h => { if (headers[h]) delete headers[h]; });
    
    headers['Cache-Control'] = 'no-cache';
    headers['Pragma'] = 'no-cache';

    $done({ headers });
} else {
    // --- 2. 响应阶段：动态修改会员数据 ---
    const rawUA = ($request && $request.headers) ? ($request.headers['User-Agent'] || $request.headers['user-agent'] || "") : "";
    const UA = rawUA.toLowerCase();
    const BID = ($request && $request.headers) ? ($request.headers['X-Client-Bundle-ID'] || $request.headers['x-client-bundle-id'] || "") : "";

    // 检查白名单排除
    if (EXCLUDE_APPS.some(key => UA.includes(key.toLowerCase()) || BID.includes(key))) {
        $done({});
    } else {
        let obj = null;
        try { 
            obj = JSON.parse($response.body); 
        } catch (e) { 
            console.log("JSON解析失败，跳过修改");
            $done({});
        }

        if (obj && obj.subscriber) {
            // 动态生成时间，规避风控
            const now = new Date();
            const future = new Date(2099, 11, 31, 23, 59, 59);
            // 动态回溯原始购买时间为 3 年前的今天
            const originalPurchase = new Date();
            originalPurchase.setFullYear(now.getFullYear() - 3);

            const formatDate = (d) => d.toISOString().replace(/\.\d{3}Z/, 'Z');
            const dateStr = formatDate(future);
            const nowStr = formatDate(now);
            const origStr = formatDate(originalPurchase);
            
            const pData = {
                "expires_date": dateStr,
                "original_purchase_date": origStr,
                "purchase_date": nowStr,
                "ownership_type": "PURCHASED",
                "store": "app_store",
                "is_sandbox": false,
                "will_renew": true,
                "period_type": "normal"
            };

            // 初始化基础结构
            obj.subscriber.subscriptions = obj.subscriber.subscriptions || {};
            obj.subscriber.entitlements = obj.subscriber.entitlements || {};
            obj.subscriber.non_subscriptions = obj.subscriber.non_subscriptions || {};

            // --- 精准匹配库 (全面校准与扩充) ---
            const UAMappings = {
                'Sofa': { name: 'super', id: 'sofa_family_29999_onetime'},
                'Welltory': { name: 'pro', id: 'com.welltory.subscription.annual'},
                'CineDock': { name: 'CineDock Pro', id: 'cn.ixiaoxiang.video.lifetime' },
                'FilmNoir': { name: 'plus', id: 'app.filmnoir.appstore.purchases.lifetime' },
                'Photomator': { name: 'pixelmator_photo_pro_access', id: 'pixelmator_photo_pro_subscription_v1_pro_offer' },
                'WaterMinder': { name: 'waterminder-pro', id: 'waterminder.premiumYearly' },
                'Endel': { name: 'pro', id: 'Lifetime'},
                'Gentler': { name: 'premium', id: 'app.gentler.activity.nonconsumable.onetime1' },
                'Law': { name: 'vip', id: 'LawVIPOneYear'}, 
                'Darkroom': { name: 'co.bergen.Darkroom.entitlement.allToolsAndFilters', id: 'darkroom_gold_lifetime' },
                'AdGuard%20Home': { name: 'aghrpro', id: 'adguard.home.remote.pro' },
                'Pillow': { name: 'premium', id: 'com.neybox.pillow.premium.year' },
                'MoneyThings': { name: 'Premium', id: 'com.lishaohui.cashflow.lifetime' },
                'Anybox': { name: 'pro', id: 'cc.anybox.Anybox.annual' },
                'ShellBean': { name: 'pro', id: 'com.ningle.shellbean.iap.forever' },
                'iplayTV': { name: 'com.ll.btplayer.12', id: 'com.ll.btplayer.12' },
                'MOZE': { name: 'premium', id: 'moze_pro_yearly' },
                // --- 2025-2026 新增热门适配 ---
                'Vision': { name: 'pro', id: 'com.vision.yearly_pro' },
                'Craft': { name: 'pro', id: 'com.lukilabs.craft.pro.annual' },
                'Structured': { name: 'pro', id: 'un Prostuctured Pro' },
                'Figma': { name: 'pro', id: 'com.figma.ios.pro' },
                'Slopes': { name: 'pass', id: 'com.un損lopes.annual_pass' }
            };

            let matchedAppName = "";
            let isMatched = false;

            // 1. 优先精准匹配
            for (const key in UAMappings) {
                if (new RegExp(key, 'i').test(UA) || new RegExp(key, 'i').test(BID)) {
                    matchedAppName = key;
                    const { name, id } = UAMappings[key];
                    const names = name.includes('&') ? name.split('&') : [name];
                    
                    obj.subscriber.subscriptions[id] = pData;
                    obj.subscriber.non_subscriptions[id] = [{
                        "id": id, "is_sandbox": false, "purchase_date": nowStr,
                        "original_purchase_date": origStr, "store": "app_store"
                    }];
                    names.forEach(n => {
                        obj.subscriber.entitlements[n] = { ...pData, "product_identifier": id };
                    });
                    isMatched = true;
                    break;
                }
            }

            // 2. 深度智能化盲猜 (未匹配到库时触发)
            if (!isMatched) {
                // 动态提取 App 名字，提取不到则用默认名
                matchedAppName = BID ? BID.split('.').pop() : (rawUA.split('/')[0] || "Unknown").split(' ')[0];
                
                // 扩充国际化高频权限代称
                const guessNames = ['pro', 'premium', 'plus', 'vip', 'all', 'gold', 'membership', 'advanced', 'lifetime', 'ultimate', 'super'];
                const guessId = BID ? `${BID}.lifetime` : `com.${matchedAppName.toLowerCase()}.lifetime`;

                guessNames.forEach(n => {
                    if (!obj.subscriber.entitlements[n]) {
                        obj.subscriber.entitlements[n] = { ...pData, "product_identifier": guessId };
                    }
                });
                obj.subscriber.subscriptions[guessId] = pData;
                isMatched = true;
            }

            // 3. 全量刷新与漂白（覆盖 App 现有的过期/试用项）
            if (obj.subscriber.subscriptions) {
                Object.keys(obj.subscriber.subscriptions).forEach(id => {
                    obj.subscriber.subscriptions[id] = { ...pData };
                });
            }
            if (obj.subscriber.entitlements) {
                Object.keys(obj.subscriber.entitlements).forEach(n => {
                    const pid = obj.subscriber.entitlements[n].product_identifier;
                    obj.subscriber.entitlements[n] = { ...pData, "product_identifier": pid || "com.premium.yearly" };
                });
            }
            if (obj.subscriber.non_subscriptions) {
                Object.keys(obj.subscriber.non_subscriptions).forEach(id => {
                    obj.subscriber.non_subscriptions[id] = [{
                        "id": id, "is_sandbox": false, "purchase_date": nowStr,
                        "original_purchase_date": origStr, "store": "app_store"
                    }];
                });
            }

            // 4. 节流通知
            const lastNotify = $.getdata(`${$.name}_${matchedAppName}`) || 0;
            if ((Date.now() - parseInt(lastNotify)) / 36e5 >= NOTIFY_INTERVAL_HOURS) {
                $.notify(`🚀 ${$.name}`, `${matchedAppName} 已激活永久特权`, `安全运行中 · 有效期至 2099`);
                $.setdata(Date.now().toString(), `${$.name}_${matchedAppName}`);
            }

            $done({ body: JSON.stringify(obj) });
        } else {
            $done({});
        }
    }
}

// 环境兼容类
function Env(n){this.name=n;this.notify=(t,s,c)=>{if(typeof $notification!="undefined")$notification.post(t,s,c);else if(typeof $notify!="undefined")$notify(t,s,c)};this.getdata=k=>(typeof $persistentStore!="undefined"?$persistentStore.read(k):(typeof $prefs!="undefined"?$prefs.valueForKey(k):null));this.setdata=(v,k)=>(typeof $persistentStore!="undefined"?$persistentStore.write(v,k):(typeof $prefs!="undefined"?$prefs.setValueForKey(v,k):false))}
