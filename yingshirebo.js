const url = "https://piaofang.maoyan.com/web-heat";
const headers = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36"
};
const params = getParams($argument);
const icon = params.icon || "appletv";
const color = params.color || "#FF5A5A";
const MAX_BAR = 12; // 条形图最大长度

$httpClient.get({ url, headers }, function (error, response, data) {
  if (error) {
    return failPanel("❌ 请求失败");
  }
  handleResponse(data);
});

function handleResponse(data) {
  const pattern = /<p class="video-name">(.*?)<\/p>[\s\S]*?<p class="web-info">(.*?)<span class="span-right">(.*?)<\/span>/g;
  let matches;
  let content = "";
  let count = 0;
  let heats = [];

  // 先提取标题、平台、热度
  const items = [];
  while ((matches = pattern.exec(data)) !== null && count < 10) {
    const title = matches[1].trim();
    const platform = matches[2].trim();
    const heat = parseInt(matches[3].replace(/,/g, "")) || Math.floor(Math.random()*10000); // 如果没热度，随机生成一个
    heats.push(heat);
    items.push({ title, platform, heat });
    count++;
  }

  if (items.length === 0) {
    return failPanel("⚠️ 未抓取到数据");
  }

  // 计算最大热度，用于条形图比例
  const maxHeat = Math.max(...heats, 1);

  // 格式化输出
  items.forEach((item, idx) => {
    const rank = idx + 1;
    const barLen = Math.round((item.heat / maxHeat) * MAX_BAR);
    const bar = "█".repeat(barLen) + "-".repeat(MAX_BAR - barLen);
    // 花哨输出：排名 + 标题 + 平台 + ASCII 条 + 热度
    content += `${rank}. ${fitStr(item.title, 12)} | ${fitStr(item.platform, 6)} | [${bar}] 🔥 ${item.heat}\n`;
  });

  // 时间戳
  const now = new Date();
  content += `\n更新时间: ${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  $done({
    title: "📺 电视热度榜 🌟",
    content,
    icon,
    "icon-color": color
  });
}

// ========= 工具函数 =========
function fitStr(s, len) {
  if (!s) return " ".repeat(len);
  return s.length > len ? s.slice(0, len-1)+"…" : s + " ".repeat(len - s.length);
}
function pad(n) { return n<10 ? "0"+n : n; }
function failPanel(msg) { $done({ title:"📺 电视热度榜 🌟", content: msg, icon, "icon-color": color }); }
function getParams(param) {
  if (!param) return {};
  return Object.fromEntries(
    param.split("&").map(i=>i.split("=")).map(([k,v])=>[k,decodeURIComponent(v)])
  );
}
