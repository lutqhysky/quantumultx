/*
 * iTunes 订阅破解脚本 - 2026 终极增强版
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
    "com.qingniaofly.chineseLaw": {
        name: "中国法律",
        product_id: "Chineselaw_Year_Int0",
        type: "subscription"
    },
    // ... 这里保留你之前的其他 App 配置
    "com.loveyouchenapps.knockout": {
        name: "Knockout (抠图)",
        product_id: "com.knockout.7daysplus",
        type: "subscription",
        trial: false,
        notes: "照片背景去除"
    },
"com.qingniaofly.chineseLaw": {
        name: "中国法律",
        product_id: "Chineselaw_Year_Int0",
        type: "subscription", // 必须是这个字符串
        trial: false,
        notes: "修正后的配置"
    },
    "com.icandiapps.nightsky": {
        name: "Night Sky (天文)",
        product_id: "com.icandiapps.ns4.monthly",
        type: "subscription",
        trial: false,
        notes: "天文观测"
    },
    "com.speed.test.internet": {
        name: "Speed Test (网速)",
        product_id: "com.speed.test.internet.subscription.year",
        type: "subscription",
        trial: false,
        notes: "网速测试"
    },
    "co.bazaart.app": {
        name: "Bazaart (编辑)",
        product_id: "Bazaart_Premium_Monthly_v10",
        type: "subscription",
        trial: false,
        notes: "照片编辑"
    },
    "com.unfold.app": {
        name: "Unfold (故事)",
        product_id: "com.unfold.app.yearly",
        type: "subscription",
        trial: false,
        notes: "故事制作"
    },
    "com.pixite.pigment": {
        name: "Pigment (涂色)",
        product_id: "com.pixite.pigment.premium.yearly",
        type: "subscription",
        trial: false,
        notes: "涂色书"
    },
    "com.jianili.Booka": {
        name: "Booka",
        product_id: "com.jianili.Booka.pro.monthly",
        type: "subscription",
        trial: false,
        notes: "电子书"
    },
    "com.tapuniverse.texteditor": {
        name: "Text Editor",
        product_id: "com.tapuniverse.texteditor.w",
        type: "subscription",
        trial: false,
        notes: "文本编辑器"
    },
    "com.vgfit.waterreminder": {
        name: "Water Reminder",
        product_id: "com.vgfit.waterreminder.year",
        type: "subscription",
        trial: true,
        notes: "喝水提醒"
    },
    "com.resonantcavity.Voloco": {
        name: "Voloco",
        product_id: "jean_laroche",
        type: "subscription",
        trial: false,
        notes: "音频处理"
    },
    "com.teadoku.flashnote": {
        name: "Flashnote",
        product_id: "pro_ios_ipad_mac",
        type: "non-consumable",
        trial: false,
        notes: "笔记应用"
    },
    "com.mirmay.DownloaderFREE": {
        name: "Downloader FREE",
        product_id: "com.mirmay.DownloaderFree.subs.monthly_trial",
        type: "subscription",
        trial: true,
        notes: "下载器"
    },
    "com.ilbsoft.irelax": {
        name: "BetterSleep",
        product_id: "com.ipnossoft.rm.subscription.year.7daystrial.60usd",
        type: "subscription",
        trial: true,
        notes: "睡眠助手"
    },
    "com.zhangchao.AudioPlayer": {
        name: "Ever Play",
        product_id: "om.zhangchao.AudioPlayer.subscription.oneWeek",
        type: "subscription",
        trial: false,
        notes: "音频播放器"
    },
    "com.duy.CasioFx": {
        name: "科学计算器",
        product_id: "calculator_premium_monthly",
        type: "subscription",
        trial: false,
        notes: "卡西欧计算器"
    },
    "me.imgbase.videoday": {
        name: "Videoday",
        product_id: "me.imgbase.videoday.profeaturesYearly",
        type: "subscription",
        trial: true,
        notes: "视频处理"
    },
    "health.sleep.sounds.tracker.alarm.calm": {
        name: "星空睡眠",
        product_id: "shuteye.all.premium.year.tier1",
        type: "subscription",
        trial: true,
        notes: "睡眠监测"
    },
    "com.risingcabbage.pro.camera": {
        name: "ReLens",
        product_id: "com.risingcabbage.pro.camera.yearlysubscription",
        type: "subscription",
        trial: true,
        notes: "专业相机"
    },
    "com.mematom.ios": {
        name: "Mematom",
        product_id: "MMYear",
        type: "subscription",
        trial: false,
        notes: "健康应用"
    },
    "app.feelsy": {
        name: "Feelsy",
        product_id: "com.feelsy.weekly.b",
        type: "subscription",
        trial: true,
        notes: "心情记录"
    },
    "com.shapr3d.shapr": {
        name: "Shapr3D",
        product_id: "com.shapr3d.shapr.iap.lite2.renewing.yearly",
        type: "subscription",
        trial: true,
        notes: "3D建模"
    },
    "com.CADraw.zc": {
        name: "CAD绘图",
        product_id: "com.CADraw.zc.30",
        type: "subscription",
        trial: false,
        notes: "CAD工具"
    },
    "com.magicmoon.chatai": {
        name: "Chat AI",
        product_id: "aichat_iap_yearly_autorenewable",
        type: "subscription",
        trial: true,
        notes: "AI对话"
    },
    // 已删除: com.firecore.infuse (Infuse)
    "com.ewa.ewaapp": {
        name: "EWA英语",
        product_id: "com.ewa.renewable.subscription.year8",
        type: "subscription",
        trial: true,
        notes: "英语学习"
    },
    "com.dream4today.HeartRate.Free": {
        name: "心率检测",
        product_id: "com.zane.premium.yearly333",
        type: "subscription",
        trial: true,
        notes: "心率监测"
    },
    "com.byteapp.tubepod": {
        name: "Tubepod",
        product_id: "com.byteapp.tubepod.year",
        type: "subscription",
        trial: true,
        notes: "播客应用"
    }
};

function processReceipt(body) {
    try {
        let obj = JSON.parse(body);
        
        // 1. 自动定位 Bundle ID (增加容错，有些 App 的 ID 在外层)
        const bundleId = obj.receipt?.bundle_id || obj.bundle_id;
        const appConfig = SUPPORTED_APPS[bundleId];

        if (!appConfig) return body;

        if (CONFIG.DEBUG) console.log(`[破解成功] 正在处理: ${appConfig.name}`);

        const futureDate = getFutureDate();
        const pId = appConfig.product_id;
        const tId = CONFIG.TRANSACTION_ID;

        // 2. 构造通用的订阅条目
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

        // 3. 多重覆盖：根目录、receipt 内部、latest 数组
        obj.status = 0;
        obj.environment = "Production";
        
        // 修改 receipt 内部数据
        if (obj.receipt) {
            obj.receipt.in_app = [subInfo];
            obj.receipt.bundle_id = bundleId;
            // 某些 App 校验原始版本号
            obj.receipt.original_application_version = "1.0"; 
        }

        // 修改服务端最新的 receipt 记录（最关键）
        obj.latest_receipt_info = [subInfo];
        
        // 修改续订状态
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


