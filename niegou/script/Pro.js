/*
 * iTunes 订阅破解脚本 - 增强维护版
 * 适用平台：Surge, Loon, Quantumult X
 * 特点：模块化配置，易于维护，自动计算过期时间
 * 
 * 维护说明：
 * 1. 所有App配置都在 SUPPORTED_APPS 对象中
 * 2. 格式统一，复制粘贴即可添加新App
 * 3. 注释清楚，方便查找和修改
 */

// ==================== 全局配置 ====================
const CONFIG = {
    DEBUG: false,                    // 调试模式开关
    EXPIRE_YEARS: 5,                  // 过期年限（从当前时间算起）
    AUTO_RENEW: true,                 // 自动续订状态
    TRANSACTION_ID: "100000000000000", // 固定交易ID（节省资源）
    PURCHASE_DATE: "2023-01-01 00:00:00 Etc/GMT",  // 固定购买日期
    PURCHASE_DATE_MS: "1672531200000"               // 对应的时间戳
};

// ==================== App 配置大全 ====================
// 格式: "bundle_id": { 
//   name: "App名称",                    // 便于识别的名称
//   product_id: "订阅产品ID",            // 必须正确
//   type: "subscription",                // subscription 或 non-consumable
//   trial: false,                        // 是否为试用期
//   notes: "备注信息"                     // 可选，方便记录
// }
// ==================================================

const SUPPORTED_APPS = {

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

// ==================== 工具函数 ====================

// 计算未来日期
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
        const obj = JSON.parse(body);
        
        // 安全检查
        if (!obj || typeof obj !== 'object' || !obj.receipt || !obj.receipt.bundle_id) {
            return body;
        }

        const bundleId = obj.receipt.bundle_id;
        const appConfig = SUPPORTED_APPS[bundleId];
        
        // 如果不支持此App，直接返回
        if (!appConfig) {
            return body;
        }

        // 调试信息（仅在开启DEBUG时输出）
        if (CONFIG.DEBUG) {
            console.log(`[破解] 命中: ${appConfig.name} (${bundleId})`);
        }

        const futureDate = getFutureDate();
        const productId = appConfig.product_id;
        const transactionId = CONFIG.TRANSACTION_ID;
        
        // 确保数组存在
        if (!Array.isArray(obj.receipt.in_app)) {
            obj.receipt.in_app = [];
        }
        
        // 构建基础订阅信息
        const subInfo = {
            "product_id": productId,
            "transaction_id": transactionId,
            "original_transaction_id": transactionId,
            "purchase_date": CONFIG.PURCHASE_DATE,
            "purchase_date_ms": CONFIG.PURCHASE_DATE_MS,
            "is_trial_period": appConfig.trial ? "true" : "false",
            "in_app_ownership_type": "PURCHASED"
        };
        
        // 订阅类型添加过期时间
        if (appConfig.type === "subscription") {
            subInfo.expires_date = futureDate.date_str;
            subInfo.expires_date_ms = futureDate.ms;
            subInfo.original_purchase_date = CONFIG.PURCHASE_DATE;
            subInfo.original_purchase_date_ms = CONFIG.PURCHASE_DATE_MS;
        }
        
        // 构建响应数据
        obj.status = 0;
        obj.environment = "Production";
        obj.receipt.in_app = [subInfo];
        obj.latest_receipt_info = [subInfo];
        
        // 订阅类型添加续订信息
        if (appConfig.type === "subscription") {
            obj.pending_renewal_info = [{
                "product_id": productId,
                "auto_renew_status": CONFIG.AUTO_RENEW ? "1" : "0",
                "original_transaction_id": transactionId
            }];
        }
        
        return JSON.stringify(obj);
        
    } catch (e) {
        // 静默失败，不影响正常使用
        return body;
    }
}

// ==================== Surge 入口 ====================
try {
    let body = $response.body;
    if (!body) {
        $done({});
    } else {
        let modifiedBody = processReceipt(body);
        $done({ body: modifiedBody });
    }
} catch (e) {
    $done({});
}
