/**
 * Surge 网络信息面板 (进阶版)
 * 功能：显示当前节点名称 + 详细 IP 信息 + 流媒体解锁检测
 */

const { wifi, v4, v6 } = $network;
const IPv4 = v4.primaryAddress;
const cellularData = $network["cellular-data"];
const radio = cellularData ? cellularData.radio : '';
const carrier = cellularData ? cellularData.carrier : '';
// 获取当前 Surge 选中的代理策略名称
const currentNode = $session.proxy || "直连/本地";

// 解锁检测函数
async function checkUnlock(url) {
    return new Promise((resolve) => {
        $httpClient.get({ url: url, timeout: 2000 }, (error, response, data) => {
            if (response && response.status === 200) {
                resolve("✅");
            } else if (response && (response.status === 403 || response.status === 404)) {
                resolve("❌");
            } else {
                resolve("⚠️");
            }
        });
    });
}

(async () => {
    if (!IPv4) {
        $done({ title: "未连接网络", content: "请检查网络连接", icon: "airplane", "icon-color": "#ff9800" });
        return;
    }

    // 并行测试：获取外网IP + 4项解锁测试
    const [extIPObj, unlockNF, unlockDP, unlockYT, unlockAI] = await Promise.all([
        new Promise(r => getExternalIPv4(res => r(res))),
        checkUnlock("https://www.netflix.com/title/81215153"),
        checkUnlock("https://www.disneyplus.com"),
        checkUnlock("https://www.youtube.com/premium"),
        checkUnlock("https://ios.chat.openai.com/public-api/mobile/config")
    ]);

    const { externalIP, info } = extIPObj || { externalIP: "未知", info: "获取失败" };
    
    // 组装内容
    // 第一行显示当前节点
    // 第二行显示解锁状态
    // 第三三行显示IP和归属地
    const body = {
        title: wifi.ssid ? `WiFi: ${wifi.ssid}` : `蜂窝网络 | ${carrier}`,
        content: `当前节点：${currentNode}\n` +
                 `流媒体解锁：NF:${unlockNF} D+:${unlockDP} YT:${unlockYT} AI:${unlockAI}\n` + 
                 `外部 IPv4：${externalIP}\n` +
                 `归属地：${info}`,
        icon: "bolt.horizontal.circle.fill",
        "icon-color": "#5856D6"
    };

    $done(body);
})();

// --- 基础 IP 获取函数 ---
function getExternalIPv4(callback) {
    $httpClient.get("https://api.aapls.com/v1/geoip?lang=zh", (error, response, data) => {
        if (error || !data) {
            callback({ externalIP: "获取失败", info: "N/A" });
            return;
        }
        try {
            const json = JSON.parse(data);
            const ip = json.ip || "未知";
            const location = (json.region || "") + (json.city || "") + (json.isp || "");
            callback({ externalIP: ip, info: location || "未知地区" });
        } catch (e) {
            callback({ externalIP: "解析失败", info: "N/A" });
        }
    });
}
