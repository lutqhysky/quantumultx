/*
app下载地址：商店搜索：知音漫客
^https?:\/\/(www|f|m|newoss|edu).zhulong\.com(\/ucenter\/prod-api/\personal\/myinfo?|edu\/prod-api\/lesson\/lesson\/getScheduleByLessonId?) url script-response-body zhulong.js
MITM = *.zhulong.com
作者：清清情
*/

var body = $response.body;
var url = $request.url;
var obj = JSON.parse(body);

const vip = '/ucenter/prod-api/personal/myinfo';
const buy = 'edu/prod-api/lesson/lesson';

if (url.indexOf(vip) != -1) {
    obj.result.is_vip = 1;
    obj.result.vip_level = 1;
    body = JSON.stringify(obj);
    
}

if (url.indexOf(buy) != -1) {
    obj.result.is_buy = 1;
    body = JSON.stringify(obj);
    
}

$done({body});

