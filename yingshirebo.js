// ========= 配置 =========
const API = "https://piaofang.maoyan.com/heat/webIndex/queryWebIndexList";
const headers = {
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)",
  "Referer": "https://piaofang.maoyan.com/",
  "X-Requested-With": "XMLHttpRequest"
};

const params = getParams($argument);
const icon = params.icon || "flame";
const color = params.color || "#ff5a5a";
// 支持通过 $argument 传入 bar=20 来指定条的长度（默认 12）
const BAR_WIDTH = parseInt(params.bar) || parseInt(params.barWidth) || 12;

// ========= 请求与主逻辑 =========
$httpClient.get({ url: API, headers: headers }, function (error, response, data) {
  if (error) {
    return failPanel("❌ 请求失败");
  }

  try {
    const json = JSON.parse(data);
    const list = json?.data?.list || [];

    if (!list.length) {
      return failPanel("⚠️ 未获取到榜单数据");
    }

    // 取前 10 条
    const top = list.slice(0, 10);

    // 找到最大热度用于缩放（避免除以 0）
    const maxHeat = Math.max(...top.map(i => Number(i.heat || 0)), 1);

    let content = "";
    // 格式化输出列宽（可按需调整）
    const rankWidth = 2;     // 排名宽度（比如 "10"）
    const titleWidth = 12;   // 片名显示宽度（超长会截断）
    const platformWidth = 6; // 平台宽度

    top.forEach((item, idx) => {
      const rank = idx + 1;
      const title = (item.movieName || "未知").replace(/\s+/g, " ");
      const platform = item.platformName || "未知";
      const heat = Number(item.heat || 0);

      // 计算条形长度
      const filled = Math.round((heat / maxHeat) * BAR_WIDTH);
      const empty = BAR_WIDTH - filled;
      const bar = "#".repeat(filled) + "-".repeat(empty);

      // 百分比，保留整数
      const pct = Math.round((heat / maxHeat) * 100);

      // 美化输出：截断/填充标题与平台
      const t = fitStr(title, titleWidth);
      const p = fitStr(platform, platformWidth);

      content += `${padRight(String(rank) + ".", rankWidth + 1)} ${t} | ${p} | 🔥 ${heat} | [${bar}] ${padLeft(String(pct), 3)}%\n`;
    });

    // 时间：YYYY-MM-DD HH:mm
    const now = new Date();
    const time = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    content += `\n更新时间：${time}  （条宽=${BAR_WIDTH}）`;

    $done({
      title: "📺 电视热度榜（含 ASCII 条）",
      content,
      icon,
      "icon-color": color
    });

  } catch (e) {
    failPanel("⚠️ 数据解析失败");
  }
});

// ========= 工具函数 =========

// 截断或填充到固定宽度（中文按字符计数，可能不完全对齐但足够用）
function fitStr(s, len) {
  if (!s) return " ".repeat(len);
  // 若超长则截断并加省略号
  if (s.length > len) {
    return s.slice(0, len - 1) + "…";
  } else {
    return padRight(s, len);
  }
}

// 右补空格
function padRight(str, len) {
  str = String(str);
  return str.length >= len ? str : str + " ".repeat(len - str.length);
}

// 左补空格
function padLeft(str, len) {
  str = String(str);
  return str.length >= len ? str : " ".repeat(len - str.length) + str;
}

// 两位数补零
function pad(n) {
  return n < 10 ? "0" + n : n;
}

// 面板错误输出
function failPanel(msg) {
  $done({
    title: "📺 电视热度榜（含 ASCII 条）",
    content: msg,
    icon,
    "icon-color": color
  });
}

// 参数解析，支持 "icon=x&color=#fff&bar=16"
function getParams(param) {
  if (!param) return {};
  return Object.fromEntries(
    param.split("&").map(i => i.split("=")).map(([k, v]) => [k, decodeURIComponent(v)])
  );
}
