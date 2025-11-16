const url = "http://www.cpta.com.cn/notice.html";
const keywords = ["监理","造价","建造师"];
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

  // 计算一个月前的日期
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  // 根据日期添加不同的标记
  const content = results.map((item) => {
    const itemDate = new Date(item.date);
    const isRecent = itemDate >= oneMonthAgo;
    
    // 最近一个月用红色圆点🔴，超过一个月用灰色圆点⚪
    const marker = isRecent ? "🔴" : "⚪";
    
    return `${marker} ${item.title} — 📅 ${item.date}`;
  }).join("\n");

  // 统计最近一个月的数量
  const recentCount = results.filter(item => new Date(item.date) >= oneMonthAgo).length;
  const title = recentCount > 0 
    ? `人事考试网 — 🔴${recentCount}条最新公告` 
    : "人事考试网 — 关键公告";

  $notification.post(title, "", content);

  // 如果有最近的消息，图标颜色用红色，否则用灰色
  const iconColor = recentCount > 0 ? "#FF5A5A" : "#b8b8b8";

  $done({title:"人事考试网关键公告", content, icon:"appletv","icon-color": iconColor});
});