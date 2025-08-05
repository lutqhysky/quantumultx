;(async () => {
  const url = "https://api.vvhan.com/api/text/sexy?type=json";

  const titles = [
    "【❤️ 每日骚话】",
    "【💋 爱情金句】",
    "【🍑 撩人语录】",
    "【😘 情话速递】",
    "【🌹 恋爱文案】",
    "【🔥 撩人一击】"
  ];

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

  $httpClient.get({ url: url }, (error, response, body) => {
    // 强制打印原始回调参数，无论如何都输出
    console.log("--- 原始回调参数详情 ---");
    console.log("Error object:", error);
    console.log("Response object (raw):", response);
    console.log("Body content (raw):", body);
    console.log("------------------------");

    // 优先处理网络请求层面的错误
    if (error) {
      const errDetail = (typeof error === 'string') ? error : (error ? JSON.stringify(error, Object.getOwnPropertyNames(error) || ['message', 'stack', 'name']) : '未知错误对象');
      $notification.post("骚话推送失败", "网络请求失败", errDetail);
      console.log("❌ 网络请求错误:", errDetail);
      $done({ result: "网络请求失败" });
      return;
    }

    // 这一步在您的最新日志中被跳过，说明 response 和 body 在 JS 层面并非 null/undefined
    if (!response || body === undefined || body === null) {
      let debugMessage = "未能获取有效的HTTP响应或响应体。";
      if (response) {
        debugMessage += ` Response存在，但可能无效。Status: ${response.statusCode || 'N/A'}`;
        console.log("Response对象属性:", JSON.stringify(response, Object.getOwnPropertyNames(response) || ['statusCode', 'headers']));
      } else {
        debugMessage += " Response对象为null/undefined。";
      }

      $notification.post("骚话推送失败", "API响应异常", debugMessage + " 请检查网络或MITM设置。");
      console.log("❌ API响应异常:", debugMessage);
      $done({ result: "API响应异常" });
      return;
    }

    // 再次尝试打印 response 和 body 的状态，以确认它们在这一步是否真实存在
    console.log("--- HTTP 响应详情 (解析后) ---");
    console.log("Status Code:", response.statusCode);
    console.log("Headers (present):", !!response.headers); // 检查 headers 对象是否存在
    console.log("Body Type:", typeof body); // 打印 body 的类型
    if (typeof body === 'string') {
        console.log("Body Length:", body.length);
        console.log("📦 原始响应 (Snippet):", body.substring(0, 200) + (body.length > 200 ? '...' : '')); // 打印前200字符
    } else {
        console.log("📦 原始响应 (Non-string):", body); // 如果不是字符串，直接打印
    }
    console.log("----------------------------");

    // 检查HTTP状态码的逻辑修正：
    // 只有当状态码明确存在且不是200时，才视为错误。
    // 如果状态码是undefined，我们将信任body的内容并继续处理。
    if (response.statusCode !== undefined && response.statusCode !== 200) {
      $notification.post("骚话推送失败", "API返回非200状态码", `状态码: ${response.statusCode}. 响应: ${body.substring(0, 100)}`);
      console.log(`❌ API返回非200状态码: ${response.statusCode}. 响应体: ${body}`);
      $done({ result: "API返回非200" });
      return;
    }

    // 检查响应体是否为空字符串（如果body是字符串类型且为空）
    if (typeof body === 'string' && body.trim().length === 0) {
      $notification.post("骚话推送失败", "空响应体", "API返回了空内容。");
      console.log("❌ API返回了空内容。");
      $done({ result: "API返回空内容" });
      return;
    }

    try {
      const json = JSON.parse(body);

      // === 核心修改在这里：优先从 json.data.content 中提取 ===
      const text =
        json?.data?.content || // <-- **修改：首先尝试获取 data.content 字段**
        json?.data?.text ||   // 作为次要 fallback
        json?.text ||         // 作为更次要 fallback
        (typeof json?.data === "string" ? json.data : null); // 兼容某些直接返回字符串 data 的情况

      if (!text) {
        $notification.post("骚话推送失败", "数据解析错误", "接口未返回文本内容");
        console.log("⚠ 数据缺失或结构异常: 无法从JSON中提取文本");
        // 增加日志，打印解析后的json结构，帮助您确认
        console.log("Parsed JSON object:", JSON.stringify(json, null, 2));
        $done({ result: "数据缺失或结构异常" });
        return;
      }

      const title = pick(titles);
      const subtitle = pick(subtitles);
      $notification.post(title, subtitle, text);
      console.log("✅ 通知已发送:", text);
      $done({ result: "通知发送成功" });

    } catch (e) {
      const errDetail = (typeof e === 'string') ? e : (e ? JSON.stringify(e, Object.getOwnPropertyNames(e) || ['message', 'stack', 'name']) : '未知错误对象');
      $notification.post("骚话推送失败", "JSON解析或脚本错误", errDetail);
      console.log("❌ JSON 解析或脚本错误:", errDetail);
      console.log("Problematic Body (if available):", body);
      $done({ result: "执行异常" });
    }
  });

})();
