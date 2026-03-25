/*
 * iTunes 订阅破解脚本 - 2026 自动兜底增强版
 */

const CONFIG = {
    DEBUG: true,
    EXPIRE_YEARS: 10,
    AUTO_RENEW: true,
    TRANSACTION_ID: "400000000000000",
    PURCHASE_DATE: "2024-01-01 00:00:00 Etc/GMT",
    PURCHASE_DATE_MS: "1704067200000"
};

const SUPPORTED_APPS = {
    "com.sheldon.JumRop.JumRop": { name: "JumRop (跳绳助手)", product_id: "com.sheldon.subscription", type: "subscription" },
    "com.pacer.pacerapp": { name: "Pacer (步数全能王)",product_id: "com.pacer.inapp.autoyearly.trial.ab4",type: "subscription" },
    "com.huaye.Drinking": { name: "喝水时间", product_id: "com.huaye.Drinking.Yearly", type: "subscription" },
    "com.qingniaofly.chineseLaw": { name: "中国法律", product_id: "Chineselaw_Year_Int0", type: "subscription" },
    "com.loveyouchenapps.knockout": { name: "Knockout (抠图)", product_id: "com.knockout.7daysplus", type: "subscription" },
    "com.icandiapps.nightsky": { name: "Night Sky (天文)", product_id: "com.icandiapps.ns4.monthly", type: "subscription" },
    "com.speed.test.internet": { name: "Speed Test (网速)", product_id: "com.speed.test.internet.subscription.year", type: "subscription" },
    "co.bazaart.app": { name: "Bazaart (编辑)", product_id: "Bazaart_Premium_Monthly_v10", type: "subscription" },
    "com.unfold.app": { name: "Unfold (故事)", product_id: "com.unfold.app.yearly", type: "subscription" },
    "com.pixite.pigment": { name: "Pigment (涂色)", product_id: "com.pixite.pigment.premium.yearly", type: "subscription" },
    "com.jianili.Booka": { name: "Booka", product_id: "com.jianili.Booka.pro.monthly", type: "subscription" },
    "com.tapuniverse.texteditor": { name: "Text Editor", product_id: "com.tapuniverse.texteditor.w", type: "subscription" },
    "com.vgfit.waterreminder": { name: "Water Reminder", product_id: "com.vgfit.waterreminder.year", type: "subscription" },
    "com.resonantcavity.Voloco": { name: "Voloco", product_id: "jean_laroche", type: "subscription" },
    "com.teadoku.flashnote": { name: "Flashnote", product_id: "pro_ios_ipad_mac", type: "non-consumable" },
    "com.mirmay.DownloaderFREE": { name: "Downloader FREE", product_id: "com.mirmay.DownloaderFree.subs.monthly_trial", type: "subscription" },
    "com.ilbsoft.irelax": { name: "BetterSleep", product_id: "com.ipnossoft.rm.subscription.year.7daystrial.60usd", type: "subscription" },
    "com.zhangchao.AudioPlayer": { name: "Ever Play", product_id: "om.zhangchao.AudioPlayer.subscription.oneWeek", type: "subscription" },
    "com.duy.CasioFx": { name: "科学计算器", product_id: "calculator_premium_monthly", type: "subscription" },
    "me.imgbase.videoday": { name: "Videoday", product_id: "me.imgbase.videoday.profeaturesYearly", type: "subscription" },
    "health.sleep.sounds.tracker.alarm.calm": { name: "星空睡眠", product_id: "shuteye.all.premium.year.tier1", type: "subscription" },
    "com.risingcabbage.pro.camera": { name: "ReLens", product_id: "com.risingcabbage.pro.camera.yearlysubscription", type: "subscription" },
    "com.mematom.ios": { name: "Mematom", product_id: "MMYear", type: "subscription" },
    "app.feelsy": { name: "Feelsy", product_id: "com.feelsy.weekly.b", type: "subscription" },
    "com.shapr3d.shapr": { name: "Shapr3D", product_id: "com.shapr3d.shapr.iap.lite2.renewing.yearly", type: "subscription" },
    "com.CADraw.zc": { name: "CAD绘图", product_id: "com.CADraw.zc.30", type: "subscription" },
    "com.magicmoon.chatai": { name: "Chat AI", product_id: "aichat_iap_yearly_autorenewable", type: "subscription" },
    "com.ewa.ewaapp": { name: "EWA英语", product_id: "com.ewa.renewable.subscription.year8", type: "subscription" },
    "com.dream4today.HeartRate.Free": { name: "心率检测", product_id: "com.zane.premium.yearly333", type: "subscription" },
    "com.byteapp.tubepod": { name: "Tubepod", product_id: "com.byteapp.tubepod.year", type: "subscription" }
};

// ==================== 工具函数 ====================
function getFutureDate() {
    const now = new Date();
    const future = new Date(now);
    future.setFullYear(now.getFullYear() + CONFIG.EXPIRE_YEARS);
    
    const year = future.getFullYear();
    const month = String(future.getMonth() + 1).padStart(2, '0');
    const day = String(future.getDate()).padStart(2, '0');
    const hours = String(future.getHours()).padStart(2, '0');
    const minutes = String(future.getMinutes()).padStart(2, '0');
    const seconds = String(future.getSeconds()).padStart(2, '0');
    
    return {
        date_str: `${year}-${month}-${day} ${hours}:${minutes}:${seconds} Etc/GMT`,
        ms: future.getTime().toString()
    };
}

// ==================== 主处理函数 ====================
function processReceipt(body) {
    try {
        let obj = JSON.parse(body);
        const bundleId = obj.receipt?.bundle_id || obj.bundle_id;
        if (!bundleId) return body;

        let appConfig = SUPPORTED_APPS[bundleId];
        let isFallback = false;

        // 🛡️ 核心改动：兜底逻辑
        if (!appConfig) {
            isFallback = true;
            // 尝试获取 App 本身正在请求的 ID，如果获取不到则根据 Bundle ID 生成
            const originalProductId = obj.receipt?.in_app?.[0]?.product_id || 
                                     obj.latest_receipt_info?.[0]?.product_id || 
                                     `${bundleId}.pro`;
            
            appConfig = {
                name: "未知应用 (自动兜底)",
                product_id: originalProductId,
                type: "subscription" // 默认按订阅处理，兼容性最高
            };
        }

        if (CONFIG.DEBUG) {
            console.log(`[${isFallback ? "自动兜底" : "破解命中"}] ${appConfig.name} (${bundleId}) -> ID: ${appConfig.product_id}`);
        }

        const futureDate = getFutureDate();
        const pId = appConfig.product_id;
        const tId = CONFIG.TRANSACTION_ID;

        const subInfo = {
            "quantity": "1",
            "product_id": pId,
            "transaction_id": tId,
            "original_transaction_id": tId,
            "purchase_date": CONFIG.PURCHASE_DATE,
            "purchase_date_ms": CONFIG.PURCHASE_DATE_MS,
            "purchase_date_pst": "2024-01-01 00:00:00 America/Los_Angeles",
            "original_purchase_date": CONFIG.PURCHASE_DATE,
            "original_purchase_date_ms": CONFIG.PURCHASE_DATE_MS,
            "original_purchase_date_pst": "2024-01-01 00:00:00 America/Los_Angeles",
            "is_trial_period": "false",
            "in_app_ownership_type": "PURCHASED",
            "web_order_line_item_id": tId
        };

        if (appConfig.type === "subscription") {
            subInfo.expires_date = futureDate.date_str;
            subInfo.expires_date_ms = futureDate.ms;
            subInfo.expires_date_pst = `${futureDate.date_str.replace("Etc/GMT", "America/Los_Angeles")}`;
        }

        obj.status = 0;
        obj.environment = "Production";
        
        if (obj.receipt) {
            obj.receipt.in_app = [subInfo];
            obj.receipt.bundle_id = bundleId;
            obj.receipt.original_application_version = "1.0"; 
        }

        obj.latest_receipt_info = [subInfo];
        
        if (appConfig.type === "subscription") {
            obj.pending_renewal_info = [{
                "product_id": pId,
                "auto_renew_status": "1",
                "original_transaction_id": tId,
                "auto_renew_product_id": pId
            }];
        }

        return JSON.stringify(obj);
    } catch (e) {
        return body;
    }
}

// ==================== 平台适配 ====================
try {
    let body = $response.body;
    if (!body) {
        $done({});
    } else {
        $done({ body: processReceipt(body) });
    }
} catch (e) {
    $done({});
}
