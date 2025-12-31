/**
 * Surge 网络信息面板 (三策略组增强版)
 */

const { wifi, v4 } = $network;
const IPv4 = v4.primaryAddress;

// --- 配置区 ---
const httpAPI_Key = "123456"; // Surge HTTP API 密码
const secondaryGroup = "Emby服务"; // 第二个策略组
const thirdGroup = "智能助理";    // 第三个策略组

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

    // 并行测试所有项目
    const [extIPObj, unlockNF, unlockDP, unlockYT, unlockAI, mainNode, embyNode, otherNode] = await Promise.all([
        new Promise(r => getExternalIP(res => r(res))),
        checkUnlock("https://www.netflix.com/title/81215153"),
        checkUnlock("https://www.disneyplus.com"),
        checkUnlock("https://www.youtube.com/premium"),
        checkUnlock("https://ios.chat.openai.com/public-api/mobile/config"),
        new Promise(r => {
            try { r($session.proxy || "自动识别中..."); } 
            catch(e) { r("查看详情"); }
        }),
        getGroupName(secondaryGroup),
        getGroupName(thirdGroup) // 获取第三个策略组节点
    ]);

    const { ip, info } = extIPObj;
    
    // --- 更加紧凑美观的排版 ---
    const content = [
        `📍 节点: ${mainNode}`,
        `🎬 Emby: ${embyNode}`,
        `🤖 选路: ${otherNode}`, // 这里显示第三个策略组
        `📺 解锁: NF:${unlockNF} | D+:${unlockDP} | YT:${unlockYT} | AI:${unlockAI}`,
        `🌐 外部 IP: ${ip}`,
        `🗺️ 归属地: ${info}`
    ].join('\n');

    $done({
        title: wifi.ssid ? `WiFi: ${wifi.ssid}` : `蜂窝网络状态`,
        content: content,
        icon: "externaldrive.connected.to.line.below.fill",
        "icon-color": "#007AFF"
    });
})();

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
