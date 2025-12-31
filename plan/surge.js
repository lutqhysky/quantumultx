/**
 * Surge 网络信息面板 (增强版：含流媒体解锁检测)
 */

const { wifi, v4, v6 } = $network;
const IPv4 = v4.primaryAddress;
const cellularData = $network["cellular-data"];
const radio = cellularData ? cellularData.radio : '';
const carrier = cellularData ? cellularData.carrier : '';
const IPv6 = v6.primaryAddress ? v6.primaryAddress.replace(/^(.{7}).+(.{7})$/, "$1****$2") : '';

// 配置参数
let GeoIPApi = "aapl"; 
let EnableIPv6 = true; 
if (typeof $argument !== 'undefined' && $argument) {
    const args = $argument.split('&');
    for (const arg of args) {
        const [key, value] = arg.split('=');
        if (key === 'GeoIPApi') GeoIPApi = value;
        if (key === 'EnableIPv6') EnableIPv6 = value === '1' || value === 'true';
    }
}

// 解锁检测函数
async function checkUnlock(url, headers = {}) {
    return new Promise((resolve) => {
        $httpClient.get({ url: url, headers: headers, timeout: 2500 }, (error, response, data) => {
            if (response && response.status === 200) {
                resolve("✅");
            } else if (response && response.status === 403) {
                resolve("❌"); // 被封锁
            } else {
                resolve("⚠️"); // 检测超时或接口变动
            }
        });
    });
}

// 辅助验证函数
function isValidIPv4(ip) { return /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip); }
function isValidIPv6(ip) { return /:/.test(ip); }

// 运营商列表
var CNNET = ['460-03', '460-05', '460-11'];
var Unicom = ['460-01', '460-06', '460-09'];
var Mobile = ['460-00', '460-02', '460-04', '460-07', '460-08'];
var server = CNNET.includes(carrier) ? "中国电信" : Unicom.includes(carrier) ? "中国联通" : Mobile.includes(carrier) ? "中国移动" : "蜂窝网络";

(async () => {
    if (!IPv4) {
        $done({ title: "未连接网络", content: "请检查网络连接", icon: "airplane", "icon-color": "#ff9800" });
        return;
    }

    // 并行执行：获取 IP 信息 和 运行解锁检测
    // 这样不会增加额外的等待时间
    const [extIPObj, unlockNF, unlockDP, unlockYT, unlockAI] = await Promise.all([
        new Promise(r => getExternalIPv4(res => r(res))),
        checkUnlock("https://www.netflix.com/title/81215153"),
        checkUnlock("https://www.disneyplus.com"),
        checkUnlock("https://www.youtube.com/premium"),
        checkUnlock("https://ios.chat.openai.com/public-api/mobile/config")
    ]);

    const { externalIP, info } = extIPObj || { externalIP: "未知", info: "获取失败" };
    const unlockStatus = `解锁：NF:${unlockNF} | D+:${unlockDP} | YT:${unlockYT} | AI:${unlockAI}`;

    const body = {
        title: wifi.ssid ? `WiFi: ${wifi.ssid}` : `蜂窝: ${server} ${radio}`,
        content: `内部 IPv4：${IPv4}\n外部 IPv4：${externalIP}\n${unlockStatus}\n归属地：${info}${IPv6 ? `\nIPv6：${IPv6}` : ""}`,
        icon: wifi.ssid ? "wifi" : "antenna.radiowaves.left.and.right",
        "icon-color": wifi.ssid ? "#007AFE" : "#35C759"
    };

    $done(body);
})();

// --- 以下是你原本的 IP 获取逻辑函数，保持不变 ---
function getExternalIPv4(callback) {
    let url = "https://api.aapls.com/v1/geoip?lang=zh"; // 这里简化为默认使用 aapl
    if (GeoIPApi === "bilibili") url = "https://api.bilibili.com/x/web-interface/zone";
    
    $httpClient.get(url, (error, response, data) => {
        if (error || !data) {
            callback({ externalIP: "获取失败", info: "N/A" });
            return;
        }
        try {
            const json = JSON.parse(data);
            const ip = json.ip || json.data?.addr || "未知";
            const info = (json.region || "") + (json.city || "") + (json.isp || json.data?.isp || "");
            callback({ externalIP: ip, info: info || "未知地区" });
        } catch (e) {
            callback({ externalIP: "解析失败", info: "N/A" });
        }
    });
}
