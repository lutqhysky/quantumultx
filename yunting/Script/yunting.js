/* 
 app下载地址：商店搜索：云听 时间 ：2022-08-01 
 ^https?:\/\/http://39.106.98.80 url script-response-body zhulong.js 
 MITM = 39.106.98.80
 作者：清清情 
 */ 
var body = $response.body; 
var url = $request.url; 
var obj = JSON.parse(body); 
const vip = '/app2355d832116cc8bd/2b31294abeefdf0bfc305dd63fd052c5/9fd11b27cf4382ad25557f49496f7032'; 
if (url.indexOf(buy) != -1) { 
       obj.isPurchased = 1;
       obj.isSubscribe = 1;
       obj.isVip = 1;
       body = JSON.stringify(obj);  
 } 
$done({body}); 
