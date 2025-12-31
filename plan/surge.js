/**
 * Surge 网络信息面板 (节点追踪版)
 * 注意：需在 Surge 开启 HTTP API 才能获取当前节点名称
 */

const { wifi, v4 } = $network;
const IPv4 = v4.primaryAddress;

// --- 配置区 ---
const httpAPI_Key = "123456"; // 请在 Surge 设置 -> HTTP API 中查看
const targetGroup = "Emby服务"; // 例如 "Proxy" 或 "🚀 节点选择"

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

// 获取当前策略组选中的节点名称
async function getActiveNode() {
    return new Promise((resolve) => {
        $httpAPI("GET", "/v1/policy_groups/select", { group_name: targetGroup }, (data) => {
            if (data && data.policy) resolve(data.policy);
            else resolve("未知节点");
        });
    });
}

(async () => {
    if (!IPv4) {
        $done({ title: "未连接网络", content: "请检查网络连接", icon: "airplane", "icon-color": "#ff9800" });
        return;
    }

    // 并行测试：获取外网IP + 解锁测试 + 获取当前节点名
    const [extIPObj, unlockNF, unlockDP, unlockYT, unlockAI, currentNode] = await Promise.all([
        new Promise(r => getExternalIPv4(res => r(res))),
        checkUnlock("https://www.netflix.com/title/81215153"),
        checkUnlock("https://www.disneyplus.com"),
        checkUnlock("https://www.youtube.com/premium"),
        checkUnlock("https://ios.chat.openai.com/public-api/mobile/config"),
        getActiveNode()
    ]);

    const { externalIP, info } = extIPObj || { externalIP: "未知", info: "N/A" };
    
    const body = {
        title: wifi.ssid ? `WiFi: ${wifi.ssid}` : `蜂窝网络状态`,
        content: `📍 当前节点: ${currentNode}\n` + 
                 `📺 解锁: NF:${unlockNF} D+:${unlockDP} YT:${unlockYT} AI:${unlockAI}\n` + 
                 `🌐 外部 IP: ${externalIP}\n` +
                 `🗺️ 归属地: ${info}`,
        icon: "location.fill.viewfinder",
        "icon-color": "#AF52DE"
    };

    $done(body);
})();

function getExternalIPv4(callback) {
    $httpClient.get("https://api.aapls.com/v1/geoip?lang=zh", (error, response, data) => {
        try {
            const json = JSON.parse(data);
            callback({ externalIP: json.ip || "未知", info: (json.region || "") + (json.city || "") + (json.isp || "") });
        } catch (e) {
            callback({ externalIP: "获取失败", info: "N/A" });
        }
    });
}
