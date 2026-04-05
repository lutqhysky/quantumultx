/*************************************
项目名称：RevenueCat 全能解锁 (旗舰 7.0 - 强制 200 OK 版)
更新内容：
1. 【核心】极大增强了请求头清理逻辑，删除所有可能导致 304 的缓存标记（ETag, Modified-Since）。
2. 【核心】增加对 if-none-match 和 x-revenuecat-etag 的深度清理。
3. 精准适配 CineDock (小象视频) 与 FilmNoir。
4. 增强全量数据漂白，支持订阅、买断、权限三重覆盖。
**************************************/

const $ = new Env("🎊 内购解锁成功");
const NOTIFY_INTERVAL_HOURS = 5; 
const EXCLUDE_APPS = ['ServerCat','LilyFM','flutter_rss_reader','EplayerX','Authenticator','ReflixiOS', 'Fileball', 'APTV', 'Forward']; 

// --- 1. 请求阶段处理 (防止 304) ---
if (typeof $response === "undefined") {
    let headers = $request.headers;
    const deleteHeaders = [
        'x-revenuecat-etag', 
        'X-RevenueCat-ETag', 
        'if-none-match', 
        'If-None-Match', 
        'if-modified-since', 
        'If-Modified-Since',
        'x-revenuecat-last-receive-time'
    ];
    
    // 强制清理缓存头，确保服务器返回 200 Body
    deleteHeaders.forEach(h => { if (headers[h]) delete headers[h]; });
    
    // 注入强制刷新头
    headers['Cache-Control'] = 'no-cache';
    headers['Pragma'] = 'no-cache';

    $done({ headers });
} else {
    // --- 2. 响应阶段处理 (解锁逻辑) ---
    const rawUA = ($request && $request.headers) ? ($request.headers['User-Agent'] || $request.headers['user-agent'] || "") : "";
    const UA = rawUA.toLowerCase();
    const BID = ($request && $request.headers) ? ($request.headers['X-Client-Bundle-ID'] || $request.headers['x-client-bundle-id'] || "") : "";

    if (EXCLUDE_APPS.some(key => UA.includes(key.toLowerCase()) || BID.includes(key))) {
        $done({});
    } else {
        let obj = null;
        try { obj = JSON.parse($response.body || '{}'); } catch (e) { console.log("JSON解析失败"); }

        if (obj && obj.subscriber) {
            const now = new Date();
            const future = new Date(2099, 11, 31, 23, 59, 59);
            const formatDate = (d) => d.toISOString().replace(/\.\d{3}Z/, 'Z');
            
            const pData = {
                "expires_date": formatDate(future),
                "original_purchase_date": "2023-01-01T00:00:00Z",
                "purchase_date": formatDate(now),
                "ownership_type": "PURCHASED",
                "store": "app_store",
                "is_sandbox": false,
                "will_renew": true,
                "period_type": "normal"
            };

            const UAMappings = {
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
                'MOZE': { name: 'premium', id: 'moze_pro_yearly' }
            };

            let isMatched = false;
            let matchedAppName = "";

            // 1. 尝试库匹配
            for (const key in UAMappings) {
                if (new RegExp(key, 'i').test(UA) || new RegExp(key, 'i').test(BID)) {
                    matchedAppName = key;
                    const { name, id } = UAMappings[key];
                    const names = name.includes('&') ? name.split('&') : [name];
                    
                    obj.subscriber.subscriptions = obj.subscriber.subscriptions || {};
                    obj.subscriber.entitlements = obj.subscriber.entitlements || {};
                    obj.subscriber.non_subscriptions = obj.subscriber.non_subscriptions || {};
                    
                    obj.subscriber.subscriptions[id] = pData;
                    obj.subscriber.non_subscriptions[id] = [{
                        "id": id, "is_sandbox": false, "purchase_date": formatDate(now),
                        "original_purchase_date": "2023-01-01T00:00:00Z", "store": "app_store"
                    }];
                    names.forEach(n => {
                        obj.subscriber.entitlements[n] = { ...pData, "product_identifier": id };
                    });
                    isMatched = true;
                    break;
                }
            }

            // 2. 强力盲猜逻辑
            if (!isMatched) {
                matchedAppName = (rawUA.split('/')[0] || "Unknown").split(' ')[0];
                const guessNames = ['pro', 'premium', 'plus', 'vip', 'all', 'gold', 'membership', 'Advanced', 'Entitlement.Pro', 'CineDock Pro'];
                const guessId = `com.${matchedAppName.toLowerCase()}.lifetime`;

                obj.subscriber.subscriptions = obj.subscriber.subscriptions || {};
                obj.subscriber.entitlements = obj.subscriber.entitlements || {};

                guessNames.forEach(n => {
                    if (!obj.subscriber.entitlements[n]) {
                        obj.subscriber.entitlements[n] = { ...pData, "product_identifier": guessId };
                    }
                });
                obj.subscriber.subscriptions[guessId] = pData;
                isMatched = true;
            }

            // 3. 全量刷新与漂白
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
                        "id": id, "is_sandbox": false, "purchase_date": formatDate(now),
                        "original_purchase_date": "2023-01-01T00:00:00Z", "store": "app_store"
                    }];
                });
            }

            if (isMatched) {
                const lastNotify = $.getdata(`${$.name}_${matchedAppName}`) || 0;
                if ((Date.now() - lastNotify) / 36e5 >= NOTIFY_INTERVAL_HOURS) {
                    $.notify(`🚀 ${$.name} 解锁`, `${matchedAppName} 已激活永久权限`, `有效期至 2099-12-31`);
                    $.setdata(Date.now().toString(), `${$.name}_${matchedAppName}`);
                }
            }
            $done({ body: JSON.stringify(obj) });
        } else {
            $done({});
        }
    }
}

function Env(n){this.name=n;this.notify=(t,s,c)=>{if(typeof $notification!="undefined")$notification.post(t,s,c);else if(typeof $notify!="undefined")$notify(t,s,c)};this.getdata=k=>(typeof $persistentStore!="undefined"?$persistentStore.read(k):(typeof $prefs!="undefined"?$prefs.valueForKey(k):null));this.setdata=(v,k)=>(typeof $persistentStore!="undefined"?$persistentStore.write(v,k):(typeof $prefs!="undefined"?$prefs.setValueForKey(v,k):false))}
