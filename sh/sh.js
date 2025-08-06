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
    // 增加更多细节的打印，确保能看到实际值
    console.log("--- HTTP 响应详情 (解析后) ---");
    console.log("Status Code:", response ? response.statusCode : "N/A (Response null/undefined)");
    console.log("Headers (present):", response ? !!response.headers : "N/A (Response null/undefined)"); // 检查 headers 对象是否存在
    console.log("Body Type:", typeof body); // 打印 body 的类型
    if (typeof body === 'string') {
        console.log("Body Length:", body.length);
        console.log("📦 原始响应 (Snippet):", body.substring(0, 200) + (body.length > 200 ? '...' : '')); // 打印前200字符
    } else {
        console.log("📦 原始响应 (Non-string):", body); // 如果不是字符串，直接打印
    }
    console.log("----------------------------");


    if (!response || body === undefined || body === null || (typeof body === 'string' && body.trim().length === 0)) {
      let debugMessage = "未能获取有效的HTTP响应或响应体。";
      if (response && response.statusCode) {
        debugMessage += ` Status: ${response.statusCode}`;
      } else if (response) {
        debugMessage += ` Response存在但无状态码。`;
      } else {
        debugMessage += " Response对象为null/undefined。";
      }
      if (typeof body === 'string' && body.trim().length === 0) {
        debugMessage += " 响应体为空字符串。";
      }

      $notification.post("骚话推送失败", "API响应异常", debugMessage + " 请检查网络或MITM设置。");
      console.log("❌ API响应异常:", debugMessage);
      $done({ result: "API响应异常" });
      return;
    }

    // 检查HTTP状态码的逻辑修正：
    // 只有当状态码明确存在且不是200时，才视为错误。
    // 如果状态码是undefined，我们将信任body的内容并继续处理。
    if (response && response.statusCode !== undefined && response.statusCode !== 200) {
      $notification.post("骚话推送失败", "API返回非200状态码", `状态码: ${response.statusCode}. 响应: ${body.substring(0, Math.min(body.length, 100))}`);
      console.log(`❌ API返回非200状态码: ${response.statusCode}. 响应体: ${body}`);
      $done({ result: "API返回非200" });
      return;
    }


    try {
      const json = JSON.parse(body);
      console.log("DEBUG: Parsed JSON Object:", JSON.stringify(json, null, 2)); // 打印完整的解析后JSON对象

      // === 核心修改在这里：更健壮的文本提取和空字符串检查 ===
      let text =
        json?.data?.content || // <-- **修改：首先尝试获取 data.content 字段**
        json?.data?.text ||   // 作为次要 fallback
        json?.text ||         // 作为更次要 fallback
        null;                 // 默认值设为null

      // 兼容某些直接返回字符串 data 的情况 (虽然 vvhan.com 不会这样)
      if (text === null && typeof json?.data === "string") {
          text = json.data;
      }

      // 确保 text 是字符串，并去除首尾空格
      if (typeof text === 'string') {
          text = text.trim();
      }

      // === 增加详细的 text 变量调试信息 ===
      console.log("DEBUG: Extracted 'text' value:", text);
      console.log("DEBUG: Type of 'text':", typeof text);
      console.log("DEBUG: Is 'text' null/undefined?", text === null || text === undefined);
      console.log("DEBUG: Is 'text' an empty string?", typeof text === 'string' && text.length === 0);


      // 更严格的空内容判断：如果 text 为 null/undefined 或空字符串
      if (!text || (typeof text === 'string' && text.length === 0)) {
        $notification.post("骚话推送失败", "数据解析错误", "接口未返回有效文本内容或内容为空。");
        console.log("⚠ 数据缺失或结构异常: 无法从JSON中提取文本 (或为空字符串)");
        console.log("Parsed JSON object (for context):", JSON.stringify(json, null, 2));
        $done({ result: "数据缺失或结构异常" });
        return;
      }

      const title = pick(titles);
      const subtitle = pick(subtitles);
      $notification.post(title, subtitle, text); // 使用经过检查和处理的 text 变量
      console.log("✅ 通知已发送: [" + text + "]"); // 用方括号包起来，防止空字符串显示不明显
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
