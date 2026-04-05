/*************************************
项目名称：RevenueCat 全能解锁 (旗舰 5.0 - 墨鱼逻辑集成版)
更新内容：
1. 集成墨鱼版多重权限识别逻辑 (支持 & 符号)
2. 强化“盲猜”逻辑，加入 plus, all, vip 等高频词
3. 精准修正 FilmNoir, Photomator 等大厂 ID
**************************************/

const $ = new Env("🎊 内购解锁成功");
const NOTIFY_INTERVAL_HOURS = 2; 
const EXCLUDE_APPS = ['LilyFM','flutter_rss_reader','EplayerX','Authenticator','ReflixiOS', 'Fileball', 'APTV', 'Forward']; 

if (typeof $response === "undefined") {
    let headers = $request ? $request.headers : null;
    if (headers) {
        const deleteHeaders = ['x-revenuecat-etag', 'X-RevenueCat-ETag', 'if-none-match', 'If-None-Match', 'x-revenuecat-last-receive-time'];
        deleteHeaders.forEach(h => { if (headers[h]) delete headers[h]; });
        headers['Cache-Control'] = 'no-cache';
    }
    $done({ headers: headers || {} });
} else {
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

            // --- 精准库 (结合墨鱼数据) ---
            const UAMappings = {
                'WaterMinder': { name: 'waterminder-pro', id: 'waterminder.premiumYearly' },
                'Endel': { name: 'pro', id: 'Lifetime'},  //Endel
                'Gentler': { name: 'premium', id: 'app.gentler.activity.nonconsumable.onetime1' },
                'Law': { name: 'vip', id: 'LawVIPOneYear'},  //中国法律 
                'FilmNoir': { name: 'plus', id: 'app.filmnoir.appstore.purchases.lifetime' },
                'Photomator': { name: 'pixelmator_photo_pro_access', id: 'pixelmator_photo_pro_subscription_v1_pro_offer' },
                'Darkroom': { name: 'co.bergen.Darkroom.entitlement.allToolsAndFilters', id: 'darkroom_gold_lifetime' },
                'AdGuard%20Home': { name: 'aghrpro', id: 'adguard.home.remote.pro' },
                'Pillow': { name: 'premium', id: 'com.neybox.pillow.premium.year' },
                'MoneyThings': { name: 'Premium', id: 'com.lishaohui.cashflow.lifetime' },
                'Anybox': { name: 'pro', id: 'cc.anybox.Anybox.annual' },
                'ShellBean': { name: 'pro', id: 'com.ningle.shellbean.iap.forever' },
                'iplayTV': { name: 'com.ll.btplayer.12', id: 'com.ll.btplayer.12' },
                'Endel': { name: 'pro', id: 'Lifetime'},
                'Gentler': { name: 'premium', id: 'app.gentler.activity.nonconsumable.onetime1' },
                'MOZE': { name: 'premium', id: 'moze_pro_yearly' }
            };

            let isMatched = false;
            let appName = "";

            // 1. 尝试库匹配 (支持墨鱼的 & 多重权限逻辑)
            for (const key in UAMappings) {
                if (new RegExp(key, 'i').test(UA) || new RegExp(key, 'i').test(BID)) {
                    appName = key;
                    const { name, id } = UAMappings[key];
                    const names = name.includes('&') ? name.split('&') : [name];
                    
                    obj.subscriber.subscriptions = obj.subscriber.subscriptions || {};
                    obj.subscriber.entitlements = obj.subscriber.entitlements || {};
                    
                    obj.subscriber.subscriptions[id] = pData;
                    names.forEach(n => {
                        obj.subscriber.entitlements[n] = { ...pData, "product_identifier": id };
                    });
                    isMatched = true;
                    break;
                }
            }

            // 2. 强力盲猜逻辑 (若库未匹配，针对 FilmNoir 等顽固 App 注入万能钥匙)
            if (!isMatched) {
                appName = (rawUA.split('/')[0] || "Unknown").split(' ')[0];
                const guessNames = ['pro', 'premium', 'plus', 'vip', 'all', 'gold', 'membership', 'Advanced', 'Entitlement.Pro'];
                const guessId = `com.${appName.toLowerCase()}.lifetime`;

                obj.subscriber.subscriptions = obj.subscriber.subscriptions || {};
                obj.subscriber.entitlements = obj.subscriber.entitlements || {};

                // 只有在 entitlements 为空或没有 VIP 权限时才盲猜
                guessNames.forEach(n => {
                    if (!obj.subscriber.entitlements[n]) {
                        obj.subscriber.entitlements[n] = { ...pData, "product_identifier": guessId };
                    }
                });
                obj.subscriber.subscriptions[guessId] = pData;
                isMatched = true;
            }

            // 3. 全量数据漂白 (防止残留过期的订阅干扰)
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

            // 通知逻辑
            if (isMatched) {
                const lastNotify = $.getdata(`${$.name}_${appName}`) || 0;
                if ((Date.now() - lastNotify) / 36e5 >= NOTIFY_INTERVAL_HOURS) {
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

function Env(n){this.name=n;this.notify=(t,s,c)=>{if(typeof $notification!="undefined")$notification.post(t,s,c);else if(typeof $notify!="undefined")$notify(t,s,c)};this.getdata=k=>(typeof $persistentStore!="undefined"?$persistentStore.read(k):(typeof $prefs!="undefined"?$prefs.valueForKey(k):null));this.setdata=(v,k)=>(typeof $persistentStore!="undefined"?$persistentStore.write(v,k):(typeof $prefs!="undefined"?$prefs.setValueForKey(v,k):false))}
