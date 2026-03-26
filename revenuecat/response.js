const $ = new Env("RevenueCatUltraHybrid");
const NOTIFY_INTERVAL_HOURS = 2; 
const EXCLUDE_APPS = ['Authenticator','ReflixiOS', 'Fileball', 'APTV', 'Forward']; 

if (typeof $response === "undefined") {
    // --- 1. 请求阶段：移除缓存指纹 ---
    let headers = $request ? $request.headers : null;
    if (headers) {
        const deleteHeaders = [
            'x-revenuecat-etag', 'X-RevenueCat-ETag', 
            'if-none-match', 'If-None-Match',
            'x-revenuecat-last-receive-time'
        ];
        deleteHeaders.forEach(h => { if (headers[h]) delete headers[h]; });
        headers['Cache-Control'] = 'no-cache';
        headers['Pragma'] = 'no-cache';
    }
    $done({ headers: headers || {} });

} else {
    // --- 2. 响应阶段：修改数据 ---
    const headers = ($request && $request.headers) ? $request.headers : {};
    const UA = (headers['User-Agent'] || headers['user-agent'] || "").toLowerCase();
    const BID = (headers['X-Client-Bundle-ID'] || headers['x-client-bundle-id'] || "");

    // 检查排除
    const isExcluded = EXCLUDE_APPS.some(key => UA.includes(key.toLowerCase()) || BID.includes(key));

    if (isExcluded) {
        $done({});
    } else {
        let obj = null;
        try {
            obj = JSON.parse($response.body || '{}');
        } catch (e) {
            console.log(`[${$.name}] JSON解析失败`);
        }

        if (obj && obj.subscriber) {
            const now = new Date();
            const future = new Date(2099, 11, 31, 23, 59, 59);
            const formatDate = (date) => date.toISOString().replace(/\.\d{3}Z/, 'Z');
            
            const purchaseData = {
                "expires_date": formatDate(future),
                "original_purchase_date": formatDate(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())),
                "purchase_date": formatDate(now),
                "ownership_type": "PURCHASED",
                "store": "app_store",
                "is_sandbox": false,
                "will_renew": true
            };

            const UAMappings = {
                'Charger': { name: 'pro', id: 'com.charginglite.weekly' },
                'Halo': { name: 'premium', id: 'halo_5999_1y_1w0' },
                'Structured': { name: 'pro', id: 'today.structured.pro' },
                'Anybox': { name: 'pro', id: 'cc.anybox.Anybox.annual' },
                'MoneyThings': { name: 'Premium', id: 'com.lishaohui.cashflow.lifetime' },
                'MOZE': { name: 'Premium', id: 'moze_pro_yearly' },
                'Photomator': { name: 'pixelmator_photo_pro_access', id: 'pixelmator_photo_yearly_v1' },
                'PhotoRoom': { name: 'business', id: 'com.background.business.yearly' },
                'LimiCam': { name: 'ProVersionLifeTime', id: 'com.uzero.cn.fojicam.life2' },
                'ShellBean': { name: 'pro', id: 'com.ningle.shellbean.iap.forever' },
                'AdGuard%20Home': { name: 'aghrpro', id: 'adguard.home.remote.pro' },
                'Leica%20LUX': { name: 'pro', id: 'annual_subscribers_first_cohort' },
                'SleepSounds': { name: 'vip', id: 'VIPOneMonth' },
                'iplayTV': { name: 'com.ll.btplayer.12', id: 'com.ll.btplayer.12' },
                'WaterMinder': { name: 'waterminder-pro', id: 'waterminder.premiumYearly' },
                 'Endel': { name: 'pro', id: 'Lifetime'},  //Endel
                'Gentler': { name: 'premium', id: 'app.gentler.activity.nonconsumable.onetime1' },
                'Law': { name: 'vip', id: 'LawVIPOneYear'},  //中国法律
                'GentlerStreak': { name: 'premium', id: 'app.gentler.activity.nonconsumable.onetime1' }
            };

            let isMatched = false;
            let appName = "";

            // A. 预设库匹配
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

            // B. 自动探测
            if (obj.subscriber.entitlements) {
                Object.keys(obj.subscriber.entitlements).forEach(ent => {
                    const originalId = obj.subscriber.entitlements[ent].product_identifier;
                    obj.subscriber.entitlements[ent] = { ...purchaseData, "product_identifier": originalId || "com.premium.yearly" };
                    if (originalId) {
                        obj.subscriber.subscriptions = obj.subscriber.subscriptions || {};
                        obj.subscriber.subscriptions[originalId] = { ...purchaseData };
                    }
                });
                isMatched = true;
                appName = appName || "Auto-Detected";
            }

            // C. 全量刷新
            if (obj.subscriber.subscriptions) {
                Object.keys(obj.subscriber.subscriptions).forEach(sub => {
                    obj.subscriber.subscriptions[sub] = { ...purchaseData };
                });
            }

            if (isMatched) {
                console.log(`[${$.name}] 成功匹配: ${appName}`);
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

// 兼容性环境
function Env(name) {
    this.name = name;
    this.notify = (t, s, c) => {
        if (typeof $notification !== "undefined") $notification.post(t, s, c);
        else if (typeof $notify !== "undefined") $notify(t, s, c);
    };
    this.getdata = (k) => (typeof $persistentStore !== "undefined" ? $persistentStore.read(k) : (typeof $prefs !== "undefined" ? $prefs.valueForKey(k) : null));
    this.setdata = (v, k) => (typeof $persistentStore !== "undefined" ? $persistentStore.write(v, k) : (typeof $prefs !== "undefined" ? $prefs.setValueForKey(v, k) : false));
}
