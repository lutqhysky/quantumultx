const url = "https://rst.shanxi.gov.cn/zwyw/tzgg/";
const keyword = "职称";   // 筛选关键字
const maxCount = 5;       // 最多推送几条公告

$httpClient.get({ url, headers: { "User-Agent": "Mozilla/5.0" } }, function(err, resp, data) {
  if (err) return $done({ title: "职称公告", content: "❌ 请求失败", icon: "appletv", "icon-color": "#b8b8b8" });

  const pattern = /<li>[\s\S]*?<a[^>]*href="(.*?)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/g;
  let matches;
  let results = [];

  while ((matches = pattern.exec(data)) !== null) {
    const title = matches[2].trim();
    const date = matches[3].trim();

    if (title.includes(keyword)) results.push({ title, date });
    if (results.length >= maxCount) break;
  }

  if (results.length === 0) return $done({ title: "职称公告", content: "⚠️ 没有找到相关公告", icon: "appletv", "icon-color": "#b8b8b8" });

  // 拼接内容，只显示标题和日期
  const content = results.map((item, idx) => `${idx+1}. ${item.title}\n📅 ${item.date}`).join("\n\n");

  $notification.post("职称公告更新", "", content);

  $done({
    title: "职称公告",
    content,
    icon: "appletv",
    "icon-color": "#FF5A5A"
  });
});
