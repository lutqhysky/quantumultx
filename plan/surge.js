/**
 * Surge 网络信息面板 (定制美化版)
 * 包含：当前 WiFi/蜂窝、策略组节点检测 (Emby服务 + 自动获取主节点)、流媒体解锁、IP 详情
 */

const { wifi, v4 } = $network;
const IPv4 = v4.primaryAddress;

// --- 配置区 ---
// 如果你设置了 HTTP API Key，请填入；如果没有设置，可以保持空字符串尝试，但部分 Surge 版本要求必须有 Key
const httpAPI_Key = ""; 
// 你指定的第二个策略组名称
const secondaryGroup = "Emby服务";

// 解锁检测函数
async function checkUnlock(url) {
    return new Promise((resolve) => {
        $httpClient.get({ url: url, timeout: 2500 }, (error, response) => {
            if (response && response.status === 200) resolve("✅");
            else if (response && (response.status === 403 || response.status === 404)) resolve("❌");
            else resolve("⚠️");
        });
    });
}

// 获取指定策略组选中的节点名称
async function getGroupName(name) {
    return new Promise((resolve) => {
        $httpAPI("GET", "/v1/policy_groups/select", { group_name: name }, (data) => {
            if (data && data.policy) resolve(data.policy);
            else resolve("未获取");
        });
    });
}

(async () => {
    if (!IPv4) {
        $done({ title: "未连接网络", content: "请检查网络连接", icon: "airplane", "icon-color": "#FF3B30" });
        return;
    }

    // 并行测试：1.获取外网IP 2.流媒体解锁 3.获取主代理节点 4.获取Emby节点
    const [extIPObj, unlockNF, unlockDP, unlockYT, unlockAI, mainNode, embyNode] = await Promise.all([
        new Promise(r => getExternalIP(res => r(res))),
        checkUnlock("https://www.netflix.com/title/81215153"),
        checkUnlock("https://www.disneyplus.com"),
        checkUnlock("https://www.youtube.com/premium"),
        checkUnlock("https://ios.chat.openai.com/public-api/mobile/config"),
        new Promise(r => {
            // 尝试获取当前主策略组(通常是 $session.proxy)，如果报错则 fallback 到 API
            try { r($session.proxy || "自动识别中..."); } 
            catch(e) { r("查看详情"); }
        }),
        getGroupName(secondaryGroup)
    ]);

    const { ip, info } = extIPObj;
    
    // --- 排版美化核心 ---
    const content = [
        `📍 节点: ${mainNode}`,
        `🎬 Emby: ${embyNode}`,
        `📺 解锁: NF:${unlockNF} | D+:${unlockDP} | YT:${unlockYT} | AI:${unlockAI}`,
        `🌐 外部 IP: ${ip}`,
        `🗺️ 归属地: ${info}`
    ].join('\n');

    $done({
        title: wifi.ssid ? `WiFi: ${wifi.ssid}` : `Cellular: 蜂窝数据`,
        content: content,
        icon: "sparkles.rectangle.stack.fill",
        "icon-color": "#5856D6"
    });
})();

// 获取外部 IP 和 地理位置
function getExternalIP(callback) {
    $httpClient.get("https://api.aapls.com/v1/geoip?lang=zh", (error, response, data) => {
        try {
            const json = JSON.parse(data);
            callback({ 
                ip: json.ip || "未知", 
                info: `${json.region || ""} ${json.city || ""} ${json.isp || ""}`.trim() 
            });
        } catch (e) {
            callback({ ip: "获取失败", info: "请检查代理设置" });
        }
    });
}
