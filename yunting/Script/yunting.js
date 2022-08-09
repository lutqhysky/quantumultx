/* 
 app下载地址：商店搜索：云听 时间 ：2022-08-01 
 ^https?:\/\/(getway|ytapi).radio.cn url script-response-body https://raw.githubusercontent.com/lutqhysky/quantumultx/mylove/yunting/Script/yunting.js
 MITM = 39.106.98.80, getway.radio.cn, ytapi.radio.cn
 作者：清清情 ,解锁VIP，但是下面有些碍眼的东西，没去掉。。
 */ 
var body = $response.body; 
var url = $request.url; 
var obj = JSON.parse(body); 
const vip = '/app2355d832116cc8bd/2b31294abeefdf0bfc305dd63fd052c5/9fd11b27cf4382ad25557f49496f7032'; 
const buy = '/ytsrv/srv/appUser/getUserInfoH5'; 
if (url.indexOf(vip) != -1) { 
       obj.isPurchased = 1;
       obj.isSubscribe = 1;
       obj.isVip = 1;
       body = JSON.stringify(obj);  
 } 
if (url.indexOf(buy) != -1) { 
       obj.object.baseInfo.isVip = 1;
       obj.object.baseInfo.vipTime = "2029-12-12";
       obj.object.baseInfo.user_type = 6;
       obj.object.baseInfo.iconStatus = 99999;
       body = JSON.stringify(obj);  
 } 
$done({body}); 
