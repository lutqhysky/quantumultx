/**
 * Surge Emby 仪表盘 - 极速稳定版
 */
const apiKey = "123456";
const targetRule = "Emby.list"; // 匹配你的规则集名称 

(async () => {
  let panel = { title: "🎬 Emby 观影统计", icon: "play.tv.fill" };
  
  // 1. 获取持久化流量数据
  let totalRaw = parseFloat($persistentStore.read("Emby_Total_Raw") || "0");
  
  try {
    const data = await new Promise((res, rej) => {
      $httpClient.get({
        url: "http://127.0.0.1:6171/v1/requests/active",
        headers: { "X-Key": apiKey }
      }, (err, resp, data) => err ? rej(err) : res(JSON.parse(data)));
    });

    // 2. 核心过滤：找 Rule 匹配且速度大于 0 的第一个连接 
    const active = data.requests.find(r => r.rule.includes(targetRule) && r.speed > 0);

    if (active) {
      const speed = active.speed; // Byte/s
      const mbps = (speed / 1024 / 1024).toFixed(2);
      
      // 3. 流量记账（按面板刷新间隔近似计算）
      totalRaw += speed * 5; // 假设面板刷新间隔是 5s
      $persistentStore.write(totalRaw.toString(), "Emby_Total_Raw");

      const totalGB = (totalRaw / 1024 / 1024 / 1024).toFixed(2);
      panel.content = `节点: ${active.originalPolicyName}\n速度: ${mbps} MB/s | 已耗: ${totalGB} GB`;
      panel["icon-color"] = "#00C853";
    } else {
      const totalGB = (totalRaw / 1024 / 1024 / 1024).toFixed(2);
      panel.content = `当前未播放\n本次观影累计: ${totalGB} GB`;
      panel["icon-color"] = "#9E9E9E";
    }
  } catch (e) {
    panel.content = "API 连接超时，请稍后再试";
  }

  // 4. 手动重置流量按钮
  if ($trigger === "button") {
    $persistentStore.write("0", "Emby_Total_Raw");
    $notification.post("Emby 统计", "", "流量计数器已清零");
    panel.content = "统计已重置";
  }

  $done(panel);
})();
