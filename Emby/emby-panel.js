/**
 * Surge Emby 观影统计 - 自动初始化版
 */
const apiKey = "123456";

(async () => {
    let panel = { title: "🎬 Emby 观影统计", icon: "play.tv.fill" };
    
    // 读取持久化数据
    let lastTotal = parseFloat($persistentStore.read("Emby_Last_Total") || "-1");
    let sessionData = parseFloat($persistentStore.read("Emby_Session_Data") || "0");

    try {
        // 1. 获取引擎总流量 
        const traffic = await new Promise((res, rej) => {
            $httpClient.get({
                url: "http://127.0.0.1:6171/v1/traffic",
                headers: { "X-Key": apiKey }
            }, (err, resp, data) => err ? rej(err) : res(JSON.parse(data)));
        });

        const currentTotal = traffic.connector.down; 
        const currentSpeed = traffic.connector.downSpeed; // 字节/秒 

        // 2. 自动初始化逻辑
        if (lastTotal === -1) {
            $persistentStore.write(currentTotal.toString(), "Emby_Last_Total");
            panel.content = "正在初始化流量起点...";
            $done(panel);
            return;
        }

        // 3. 计算增量 
        if (currentTotal > lastTotal) {
            const diff = currentTotal - lastTotal;
            // 只要总速度 > 50KB/s，就认为在产生观影消耗
            if (currentSpeed > 51200) { 
                sessionData += diff;
                $persistentStore.write(sessionData.toString(), "Emby_Session_Data");
            }
        }
        
        // 更新记录点
        $persistentStore.write(currentTotal.toString(), "Emby_Last_Total");

        // 4. 获取当前活跃节点名称 (从 active 接口辅助获取) 
        const activeData = await new Promise((res) => {
            $httpClient.get({
                url: "http://127.0.0.1:6171/v1/requests/active",
                headers: { "X-Key": apiKey }
            }, (err, resp, data) => res(data ? JSON.parse(data) : {requests:[]}));
        });
        const embyReq = activeData.requests.find(r => r.rule && r.rule.includes("Emby"));
        const nodeName = embyReq ? (embyReq.originalPolicyName || embyReq.policyName) : "检测中";

        // 5. 格式化输出
        const totalGB = (sessionData / 1024 / 1024 / 1024).toFixed(2);
        const mbps = (currentSpeed / 1024 / 1024).toFixed(2);

        if (currentSpeed > 51200) {
            panel.content = `节点: ${nodeName}\n速度: ${mbps} MB/s | 已耗: ${totalGB} GB`;
            panel["icon-color"] = "#00C853";
        } else {
            panel.content = `当前未播放\n本次累计消耗: ${totalGB} GB`;
            panel["icon-color"] = "#9E9E9E";
        }

    } catch (e) {
        panel.content = "API 响应中，请稍后刷新";
    }

    // 手动重置按钮
    if ($trigger === "button") {
        $persistentStore.write("0", "Emby_Session_Data");
        $notification.post("Emby 统计", "", "流量计数已重置");
        panel.content = "统计已重置";
    }

    $done(panel);
})();
