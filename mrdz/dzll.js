// @supported Surge
// @script-name 每日段子推送Pro
// @script-description 获取段子图文，花里胡哨通知推送

;(async () => {
  const url = "https://dayu.qqsuu.cn/neihanduanzi/apis.php?type=json";

  // 🎯 主标题池
  const titles = [
    "【🌞 今日图文段子来了】",
    "【😂 一图解压时间到】",
    "【📸 每日图文播报】",
    "【🥒 笑一笑，十年少】",
    "【🧠 今日精神食粮】",
    "【😈 兄弟图你一乐】"
  ];

  // 🌟 副标题池
  const subtitles = [
    "👀 看完你就笑了",
    "🫣 今天你乐了吗",
    "🧃 图来了，笑没了",
    "🌈 每天一图，快乐起飞",
    "🥵 轻松一下，解压瞬间",
    "🐶 不看后悔系列"
  ];

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  $httpClient.get(url, (error, response, body) => {
    if (error) {
      $notification.post("每日段子", "请求失败", String(error));
      console.log("❌ 请求失败:", error);
      $done({ result: "请求失败" });
      return;
    }

    try {
      const json = JSON.parse(body);
      const img = json?.data;

      if (!img) {
        $notification.post("每日段子", "接口数据错误", "未获取到图片链接");
        console.log("⚠️ 数据缺失");
        $done({ result: "数据缺失" });
        return;
      }

      const title = pick(titles);
      const subtitle = pick(subtitles);

      $notification.post(title, subtitle, "📲 点击查看图文段子", {
        url: img
      });

      console.log("✅ 通知发送成功:", title, "->", img);
      $done({ result: "通知发送成功" });
    } catch (e) {
      $notification.post("每日段子", "解析失败", String(e));
      console.log("❌ JSON 解析失败:", e);
      $done({ result: "解析失败" });
    }
  });
})();
