/*************************************
项目名称：RevenueCat 全能解锁 (Ultra Final 2026) - 旗舰盲猜 4.0
更新内容：
1. 精准库匹配：优先匹配已知的 App 映射。
2. 自动探测：自动修改服务器返回的现有权限。
3. **全家桶盲猜**：若库未命中，自动注入 pro, premium, vip 等 7 种常用权限名。
4. **排除系统**：支持 UA 和 Bundle ID 双重排除。
**************************************/

const $ = new Env("🎊 内购解锁成功");
const NOTIFY_INTERVAL_HOURS = 2; 
// 排除列表：遇到以下应用不执行脚本
const EXCLUDE_APPS = ['LilyFM','flutter_rss_reader','EplayerX','Authenticator','ReflixiOS', 'Fileball', 'APTV', 'Forward', 'AppStore', 'TestFlight']; 

if (typeof $response === "undefined") {
    // 请求阶段：清除缓存指纹，强制服务器返回最新数据
    let headers = $request ? $request.headers : null;
    if (headers) {
        const deleteHeaders = ['x-revenuecat-etag', 'X-RevenueCat-ETag', 'if-none-match', 'If-None-Match'];
        deleteHeaders.forEach(h => delete headers[h]);
    }
    $done({ headers: headers || {} });
} else {
    const rawUA = ($request && $request.headers) ? ($request.headers['User-Agent'] || $request.headers['user-agent'] || "") : "";
    const UA = rawUA.toLowerCase();
    const BID = ($request && $request.headers) ? ($request.headers['X-Client-Bundle-ID'] || $request.headers['x-client-bundle-id'] || "") : "";

    // 1. 检查排除
    if (EXCLUDE_APPS.some(key => UA.includes(key.toLowerCase()) || BID.includes(key))) {
        console.log(`[${$.name}] 跳过排除列表中的应用`);
        $done({});
    } else {
        let obj;
        try {
            obj = JSON.parse($response.body || '{}');
        } catch (e) {
            $done({});
            return;
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
                "will_renew": true
            };

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
                // 可在此继续添加...
            };

            let isMatched = false;
            let appName = "";

            // A. 精准库优先匹配
            for (const key in UAMappings) {
                if (new RegExp(key, 'i').test(UA) || new RegExp(key, 'i').test(BID)) {
                    const { name, id } = UAMappings[key];
                    appName = key;
                    obj.subscriber.subscriptions[id] = purchaseData;
                    obj.subscriber.entitlements[name] = { ...purchaseData, "product_identifier": id };
                    isMatched = true;
                    break;
                }
            }

            // B. 盲猜 4.0 核心：如果精准库没中，直接注入“全家桶”
            if (!isMatched) {
                // 提取应用名：取 UA 第一个斜杠前的部分
                appName = (rawUA.split('/')[0] || "Unknown").split(' ')[0].replace(/%20/g, ' ');
                const guessNames = ['pro', 'premium', 'plus', 'vip', 'gold', 'all_access', 'premium_plus'];
                const guessId = `com.${appName.toLowerCase()}.lifetime`;

                obj.subscriber.subscriptions = obj.subscriber.subscriptions || {};
                obj.subscriber.entitlements = obj.subscriber.entitlements || {};
                
                // 注入全家桶（一把钥匙开万把锁）
                guessNames.forEach(name => {
                    obj.subscriber.entitlements[name] = { ...purchaseData, "product_identifier": guessId };
                });
                obj.subscriber.subscriptions[guessId] = purchaseData;
                
                console.log(`[RC盲猜] 应用: ${appName}, 已注入全家桶权限`);
                isMatched = true;
            }

            // C. 兜底逻辑：修改服务器返回的任何现有订阅（防止漏网之鱼）
            if (obj.subscriber.entitlements) {
                Object.keys(obj.subscriber.entitlements).forEach(ent => {
                    obj.subscriber.entitlements[ent] = { ...purchaseData, "product_identifier": obj.subscriber.entitlements[ent].product_identifier || "com.premium.yearly" };
                });
            }

            // 4. 通知系统
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

// 兼容性环境 (Env)
function Env(n){this.name=n;this.notify=(t,s,c)=>{if(typeof $notification!="undefined")$notification.post(t,s,c);if(typeof $notify!="undefined")$notify(t,s,c)};this.getdata=k=>{if(typeof $persistentStore!="undefined")return $persistentStore.read(k);if(typeof $prefs!="undefined")return $prefs.valueForKey(k);return null};this.setdata=(v,k)=>{if(typeof $persistentStore!="undefined")return $persistentStore.write(v,k);if(typeof $prefs!="undefined")return $prefs.setValueForKey(v,k);return false}}
