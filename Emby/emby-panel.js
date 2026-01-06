/**
 * Surge Emby 观影统计 - 引擎流量监控版
 */
const apiKey = "123456";

(async () => {
    let panel = { title: "🎬 Emby 观影统计", icon: "play.tv.fill" };
    
    // 1. 读取上一次的总流量记录和统计值
    let lastTotal = parseFloat($persistentStore.read("Emby_Last_Total") || "0");
    let sessionData = parseFloat($persistentStore.read("Emby_Session_Data") || "0");

    try {
        // 2. 直接访问流量统计接口 (开销极小)
        const traffic = await new Promise((res, rej) => {
            $httpClient.get({
                url: "http://127.0.0.1:6171/v1/traffic",
                headers: { "X-Key": apiKey }
            }, (err, resp, data) => err ? rej(err) : res(JSON.parse(data)));
        });

        // 核心：获取 Surge 启动以来的总下行字节数 
        const currentTotal = traffic.connector.down; 
        const currentSpeed = traffic.connector.downSpeed; // 引擎计算的平均速度

        if (lastTotal > 0 && currentTotal > lastTotal) {
            // 增量计算：这次刷新间隔内跑了多少流量
            const diff = currentTotal - lastTotal;
            // 只要有速度，就认为在播放
            if (currentSpeed > 102400) { // 速度 > 100KB/s
                sessionData += diff;
                $persistentStore.write(sessionData.toString(), "Emby_Session_Data");
            }
        }
        
        // 记录本次总量供下次对比
        $persistentStore.write(currentTotal.toString(), "Emby_Last_Total");

        const totalGB = (sessionData / 1024 / 1024 / 1024).toFixed(2);
        const mbps = (currentSpeed / 1024 / 1024).toFixed(2);

        if (currentSpeed > 102400) {
            panel.content = `正在缓冲: ${mbps} MB/s\n本次累计已耗: ${totalGB} GB`;
            panel["icon-color"] = "#00C853";
        } else {
            panel.content = `播放暂停/结束\n本次观影共计: ${totalGB} GB`;
            panel["icon-color"] = "#9E9E9E";
        }

    } catch (e) {
        panel.content = "等待流量数据更新...";
    }

    // 点击重置
    if ($trigger === "button") {
        $persistentStore.write("0", "Emby_Session_Data");
        $notification.post("Emby 统计", "", "观影数据已重新开始计算");
        panel.content = "统计已清零";
    }

    $done(panel);
})();
