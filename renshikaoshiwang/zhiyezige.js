const url = "http://www.cpta.com.cn/notice.html";
const keywords = ["监理","造价","建造师","提醒"];
const maxCount = 10;

$httpClient.get({ url, headers: { "User-Agent": "Mozilla/5.0" } }, (err, resp, data) => {
  if (err) return $done({title:"人事考试网通知", content:"❌ 请求失败", icon:"appletv","icon-color":"#b8b8b8"});

  const liPattern = /<li>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>[\s\S]*?<i[^>]*>\[?(\d{4}-\d{2}-\d{2})\]?<\/i>/g;
  let matches;
  let results = [];

  while((matches = liPattern.exec(data)) !== null){
    const title = matches[1].replace(/\s+/g," ").trim();
    const date = matches[2].trim();

    if(keywords.some(k => title.includes(k))){
      results.push({title, date});
    }
    if(results.length >= maxCount) break;
  }

  if(results.length === 0) return $done({title:"人事考试网通知", content:"⚠️ 没有找到相关关键字的公告", icon:"appletv","icon-color":"#b8b8b8"});

  // 每条公告在同一行显示：标题 — 日期
  const content = results.map((item, idx) => `${idx+1}. ${item.title} — 📅 ${item.date}`).join("\n");

  $notification.post("人事考试网 — 关键公告","",""+content);

  $done({title:"人事考试网关键公告", content, icon:"appletv","icon-color":"#FF5A5A"});
});
