/*************************************
项目名称：RevenueCat 全能解锁 (Ultra Final 2026) - 旗舰版 4.0
修复说明：解决直接使用 return 导致的 SyntaxError 报错。
**************************************/

const $ = new Env("🎊 内购解锁成功");
const NOTIFY_INTERVAL_HOURS = 2; 

// --- 用户配置区 ---
const EXCLUDE_APPS = ['LilyFM','flutter_rss_reader','EplayerX','Authenticator','ReflixiOS', 'Fileball', 'APTV', 'Forward', 'AppStore', 'TestFlight']; 

const UAMappings = {
    'FilmNoir': { name: 'plus', id: 'app.filmnoir.appstore.plus.annual' },
    'AdGuard': { name: 'aghrpro', id: 'adguard.home.remote.pro' },
    'Pillow': { name: 'premium', id: 'com.neybox.pillow.premium.year' },
    'Bookfy': { name: 'Bookfy Pro', id: 'bookfy_lifetime' },
    'Charger': { name: 'pro', id: 'com.charginglite.weekly' },
    'Halo': { name: 'premium', id: 'halo_5999_1y_1w0' },
    'Structured': { name: 'pro', id: 'today.structured.pro' },
    'MOZE': { name: 'Premium', id: 'moze_pro_yearly' },
    'Leica%20LUX': { name: 'pro', id: 'annual_subscribers_first_cohort' },
    'SmartRSS': { name: 'SmartRSS Premium', id: 'premium_lifetime' }
};

// --- 逻辑执行区 ---
if (typeof $response === "undefined") {
    let headers = $request ? $request.headers : null;
    if (headers) {
        const deleteHeaders = ['x-revenuecat-etag', 'X-RevenueCat-ETag', 'if-none-match', 'If-None-Match'];
        deleteHeaders.forEach(h => { if (headers[h]) delete headers[h]; });
    }
    $done({ headers: headers || {} });
} else {
    const rawUA = ($request && $request.headers) ? ($request.headers['User-Agent'] || $request.headers['user-agent'] || "") : "";
    const UA = rawUA.toLowerCase();
    const BID = ($request && $request.headers) ? ($request.headers['X-Client-Bundle-ID'] || $request.headers['x-client-bundle-id'] || "") : "";

    if (EXCLUDE_APPS.some(key => UA.includes(key.toLowerCase()) || BID.includes(key))) {
        $done({});
    } else {
        let obj;
        try {
            obj = JSON.parse($response.body || '{}');
        } catch (e) {
            console.log(`[${$.name}] JSON解析失败`);
            $done({}); // 修复点：不再使用 return，改用 $done
        }

        if (obj && obj.subscriber) {
            const now = new Date();
            const future = new Date(2099, 11, 31, 23, 59, 59);
            const formatDate = (d) => d.toISOString().replace(/\.\d{3}Z/, 'Z');
            
            const purchaseData = {
                "expires_date": formatDate(future),
                "original_purchase_date": formatDate(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())),
                "purchase_date": formatDate(now),
                "ownership_type": "PURCHASED",
                "store": "app_store",
                "is_sandbox": false,
                "will_renew": true,
                "period_type": "normal",
                "unsubscribe_detected_at": null,
                "billing_issues_detected_at": null,
                "grace_period_expires_date": null
            };

            let isMatched = false;
            let appName = "";

            // 1. 精准库匹配
            for (const key in UAMappings) {
                if (new RegExp(key, 'i').test(UA) || new RegExp(key, 'i').test(BID)) {
                    const { name, id } = UAMappings[key];
                    appName = key;
                    obj.subscriber.subscriptions = obj.subscriber.subscriptions || {};
                    obj.subscriber.entitlements = obj.subscriber.entitlements || {};
                    obj.subscriber.subscriptions[id] = purchaseData;
                    obj.subscriber.entitlements[name] = { ...purchaseData, "product_identifier": id };
                    isMatched = true;
                    break;
                }
            }

            // 2. 盲猜逻辑
            if (!isMatched) {
                appName = (rawUA.split('/')[0] || "Unknown").split(' ')[0].replace(/%20/g, ' ');
                const guessNames = ['pro', 'premium', 'plus', 'vip', 'gold', 'all_access', 'premium_plus'];
                const guessId = `com.${appName.toLowerCase()}.lifetime`;

                obj.subscriber.subscriptions = obj.subscriber.subscriptions || {};
                obj.subscriber.entitlements = obj.subscriber.entitlements || {};
                
                guessNames.forEach(name => {
                    obj.subscriber.entitlements[name] = { ...purchaseData, "product_identifier": guessId };
                });
                obj.subscriber.subscriptions[guessId] = purchaseData;
                isMatched = true;
            }

            // 3. 强制漂白
            if (obj.subscriber.subscriptions) {
                Object.keys(obj.subscriber.subscriptions).forEach(id => {
                    obj.subscriber.subscriptions[id] = { ...purchaseData };
                });
            }
            if (obj.subscriber.entitlements) {
                Object.keys(obj.subscriber.entitlements).forEach(name => {
                    const originalId = obj.subscriber.entitlements[name].product_identifier;
                    obj.subscriber.entitlements[name] = { ...purchaseData, "product_identifier": originalId || "com.premium.yearly" };
                });
            }

            // 4. 通知
            if (isMatched) {
                const lastTime = $.getdata(`${$.name}_${appName}`) || 0;
                if ((Date.now() - lastTime) / 36e5 >= NOTIFY_INTERVAL_HOURS) {
                    $.notify(`🚀 ${$.name} 解锁`, `${appName} 已激活永久权限`, `有效期至 2099-12-31`);
                    $.setdata(Date.now().toString(), `${$.name}_${appName}`);
                }
            }

            $done({ body: JSON.stringify(obj) });
        } else {
            $done({});
        }
    }
}

// 环境封装
function Env(n){this.name=n;this.notify=(t,s,c)=>{if(typeof $notification!="undefined")$notification.post(t,s,c);else if(typeof $notify!="undefined")$notify(t,s,c)};this.getdata=k=>(typeof $persistentStore!="undefined"?$persistentStore.read(k):(typeof $prefs!="undefined"?$prefs.valueForKey(k):null));this.setdata=(v,k)=>(typeof $persistentStore!="undefined"?$persistentStore.write(v,k):(typeof $prefs!="undefined"?$prefs.setValueForKey(v,k):false))}
