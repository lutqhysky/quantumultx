
// @supported Surge
// @script-name 每日骚话推送
// @script-description 获取每日骚话文本，通过通知推送

;(async () => {
  const url = "https://api.vvhan.com/api/text/sexy?type=json";

  // 🎯 主标题池
  const titles = [
    "【❤️ 每日骚话】",
    "【💋 爱情金句】",
    "【🍑 撩人语录】",
    "【😘 情话速递】",
    "【🌹 恋爱文案】",
    "【🔥 撩人一击】"
  ];

  // 🌟 副标题池
  const subtitles = [
    "💌 句句撩心窝",
    "🧠 情感智慧时刻",
    "🫦 今天你撩了吗",
    "👀 文案收好备用",
    "📖 打开恋爱宝典",
    "🪄 魔法文字来了"
  ];

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  $httpClient.get(url, (error, response, body) => {
    if (error) {
      $notification.post("骚话推送失败", "网络请求失败", String(error));
      console.log("❌ 请求失败:", error);
      $done({ result: "请求失败" });
      return;
    }

    try {
      const json = JSON.parse(body);
      const text = json?.text;

      if (!text) {
        $notification.post("骚话推送失败", "数据解析错误", "接口未返回文本内容");
        console.log("⚠️ 数据缺失");
        $done({ result: "数据缺失" });
        return;
      }

      const title = pick(titles);
      const subtitle = pick(subtitles);

      $notification.post(title, subtitle, text);

      console.log("✅ 通知发送成功:", title, "->", text);
      $done({ result: "通知发送成功" });
    } catch (e) {
      $notification.post("骚话推送失败", "JSON解析失败", String(e));
      console.log("❌ JSON 解析失败:", e);
      $done({ result: "解析失败" });
    }
  });
})();
