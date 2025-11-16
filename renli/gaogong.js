const url = "https://rst.shanxi.gov.cn/zwyw/tzgg/";
const keyword = "职称";   // 筛选关键字
const maxCount = 5;       // 最多推送几条公告

$httpClient.get({ url, headers: { "User-Agent": "Mozilla/5.0" } }, function(err, resp, data) {
  if (err) return $done({ title: "职称公告", content: "❌ 请求失败", icon: "appletv", "icon-color": "#b8b8b8" });

  const pattern = /<li>[\s\S]*?<a[^>]*href="(.*?)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/g;
  let matches;
  let results = [];

  // 获取当前日期和一个月前的日期
  const now = new Date();
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(now.getMonth() - 1);

  while ((matches = pattern.exec(data)) !== null) {
    const title = matches[2].trim();
    const dateStr = matches[3].trim();

    if (title.includes(keyword)) {
      // 解析日期字符串 (假设格式为 YYYY-MM-DD 或 YYYY/MM/DD)
      const dateMatch = dateStr.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
      let isRecent = false;
      
      if (dateMatch) {
        const articleDate = new Date(dateMatch[1], dateMatch[2] - 1, dateMatch[3]);
        isRecent = articleDate >= oneMonthAgo;
      }
      
      results.push({ title, date: dateStr, isRecent });
    }
    
    if (results.length >= maxCount) break;
  }

  if (results.length === 0) return $done({ title: "职称公告", content: "⚠️ 没有找到相关公告", icon: "appletv", "icon-color": "#b8b8b8" });

  // 拼接内容，用红点标记最近一个月的，白点标记更早的
  const content = results.map((item, idx) => {
    const dot = item.isRecent ? "🔴" : "⚪";
    return `${dot} ${item.title}-📅 ${item.date}`;
  }).join("\n");

  $notification.post("职称公告更新", "", content);

  $done({
    title: "职称公告",
    content,
    icon: "appletv",
    "icon-color": "#FF5A5A"
  });
});