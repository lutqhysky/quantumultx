/**
 * Surge Panel: Emby 观影仪表盘 (API 深度解析版)
 */

const targetRuleSet = "Emby.list"; // 👈 根据你提供的日志，匹配这个规则集名称
const apiKey = "123456";
const apiUrl = "http://127.0.0.1:6171/v1/requests/active";

(async () => {
    let panelContent = {
        title: "🎬 Emby 观影状态",
        icon: "play.tv.fill",
        "icon-color": "#5271FF"
    };

    try {
        const response = await fetchActiveRequests();
        const requests = response.requests || [];
        
        let totalData = parseFloat($persistentStore.read("Policy_Total_Data") || "0");
        let isPlaying = $persistentStore.read("Policy_Is_Playing") === "true";

        // --- 核心优化：匹配 rule 字段中是否包含 Emby.list ---
        const embyReq = requests.find(r => 
            r.rule && r.rule.includes(targetRuleSet)
        );

        if (embyReq) {
            // 抓取实时速度
            const currentSpeed = embyReq.speed || 0;
            const speedMB = (currentSpeed / 1024 / 1024).toFixed(2);
            
            // 流量累加 (Panel 刷新间隔 3s)
            totalData += (currentSpeed * 3); 
            $persistentStore.write(totalData.toString(), "Policy_Total_Data");
            $persistentStore.write("true", "Policy_Is_Playing");

            const totalGB = (totalData / 1024 / 1024 / 1024).toFixed(2);
            
            // 节点名称处理：优先显示 originalPolicyName (即你的节点名)
            const activeNode = embyReq.originalPolicyName || embyReq.policyName;

            panelContent.content = `节点: ${activeNode}\n速度: ${speedMB} MB/s | 已耗: ${totalGB} GB`;
            panelContent["icon-color"] = "#00C853";
        } else {
            if (isPlaying) {
                const finalGB = (totalData / 1024 / 1024 / 1024).toFixed(2);
                panelContent.content = `最近观影结束\n累计消耗流量: ${finalGB} GB`;
                panelContent["icon-color"] = "#FFAB00";
            } else {
                panelContent.content = "未检测到 Emby 流量\n(等待规则 Emby.list 触发)";
                panelContent["icon-color"] = "#9E9E9E";
            }
        }
    } catch (err) {
        panelContent.content = "读取失败: " + err;
    }

    if ($trigger === "button") {
        $persistentStore.write("0", "Policy_Total_Data");
        $persistentStore.write("false", "Policy_Is_Playing");
        $notification.post("Emby 统计", "", "数据已手动重置");
    }

    $done(panelContent);
})();

function fetchActiveRequests() {
    return new Promise((resolve, reject) => {
        $httpClient.get({
            url: apiUrl,
            headers: { "X-Key": apiKey }
        }, (error, response, data) => {
            if (error) reject(error);
            else resolve(JSON.parse(data));
        });
    });
}
