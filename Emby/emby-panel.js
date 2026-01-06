/**
 * Surge Panel: Emby 观影仪表盘
 */

const targetPolicyGroup = "Emby服务"; // 👈 修改为你的策略组名字
const apiKey = "123456";
const apiUrl = "http://127.0.0.1:6171/v1/requests/active";

async function getEmbyStatus() {
    return new Promise((resolve) => {
        $httpClient.get({
            url: apiUrl,
            headers: { "X-Key": apiKey }
        }, (error, response, data) => {
            if (error || !data) {
                resolve(null);
                return;
            }
            const requests = JSON.parse(data).requests;
            // 匹配策略组
            const embyReq = requests.find(r => 
                r.policyName === targetPolicyGroup || 
                (r.rule && r.rule.includes(targetPolicyGroup))
            );
            resolve(embyReq);
        });
    });
}

(async () => {
    const embyReq = await getEmbyStatus();
    let totalData = parseFloat($persistentStore.read("Policy_Total_Data") || "0");
    let isPlaying = $persistentStore.read("Policy_Is_Playing") === "true";

    let panelContent = {
        title: "🎬 Emby 观影状态",
        icon: "play.tv.fill",
        "icon-color": "#5271FF"
    };

    if (embyReq && embyReq.speed > 0) {
        // --- 正在播放状态 ---
        const currentSpeed = embyReq.speed;
        const speedMB = (currentSpeed / 1024 / 1024).toFixed(2);
        
        // 只有在面板刷新时累加一点流量（近似值）
        // 面板刷新间隔通常由 Surge 自动控制或根据 cron 定时
        totalData += (currentSpeed * 3); // 假设面板刷新间隔约为3s，仅作趋势参考
        $persistentStore.write(totalData.toString(), "Policy_Total_Data");
        $persistentStore.write("true", "Policy_Is_Playing");

        const totalGB = (totalData / 1024 / 1024 / 1024).toFixed(2);
        const nodeName = embyReq.policyName;

        panelContent.content = `节点: ${nodeName}\n速度: ${speedMB} MB/s | 已耗: ${totalGB} GB`;
        panelContent["icon-color"] = "#00C853"; // 播放时显示绿色图标
    } else {
        // --- 空闲状态 ---
        if (isPlaying) {
            // 如果刚刚结束播放，保留最后一次的统计数值供查看，显示“已结束”
            const finalGB = (totalData / 1024 / 1024 / 1024).toFixed(2);
            panelContent.content = `最近观影已结束\n累计消耗流量: ${finalGB} GB (点击重置)`;
            panelContent["icon-color"] = "#FFAB00";
        } else {
            panelContent.content = "当前无 Emby 流量";
            panelContent["icon-color"] = "#9E9E9E";
        }
    }

    // 点击面板可以重置流量统计
    if ($trigger === "button") {
        $persistentStore.write("0", "Policy_Total_Data");
        $persistentStore.write("false", "Policy_Is_Playing");
        panelContent.content = "统计已重置";
        $notification.post("Emby 统计", "", "已手动重置流量计数器");
    }

    $done(panelContent);
})();
