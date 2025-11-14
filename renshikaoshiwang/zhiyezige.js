const url = "http://www.cpta.com.cn/notice.html";
const keywords = ["监理","造价","建造师","职业资格","提醒"];
const maxCount = 5;

$httpClient.get({ url, headers: { "User-Agent": "Mozilla/5.0" } }, (err, resp, data) => {
  if (err) return $done({title:"人事考试网通知", content:"❌ 请求失败", icon:"appletv","icon-color":"#b8b8b8"});

  const pattern = /<li[^>]*>([\s\S]*?)<i[^>]*>\[?(\d{4}-\d{2}-\d{2})\]?<\/i>/g;
  let matches;
  let results = [];

  while((matches = pattern.exec(data)) !== null){
    let liContent = matches[1].replace(/<[^>]+>/g,"").trim(); // 去掉 HTML 标签
    let date = matches[2].trim();

    // 如果标题包含任意关键词
    if(keywords.some(k => liContent.includes(k))){
      results.push({title: liContent, date});
    }
    if(results.length>=maxCount) break;
  }

  if(results.length===0) return $done({title:"人事考试网通知", content:"⚠️ 没有找到相关关键字的公告", icon:"appletv","icon-color":"#b8b8b8"});

  const content = results.map((item,idx)=>`${idx+1}. ${item.title}\n📅 ${item.date}`).join("\n\n");

  $notification.post("人事考试网 — 关键公告","",""+content);

  $done({title:"人事考试网关键公告", content, icon:"appletv", "icon-color":"#FF5A5A"});
});
