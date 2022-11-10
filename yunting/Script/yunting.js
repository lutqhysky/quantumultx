/****************************************

项目功能：云听 解锁VIP功能
下载地址：https://t.cn/A6ouQ21g
使用声明：仅供学习与交流，请勿转载与贩卖！⚠️⚠️⚠️
使用方法：需要用时先打开脚本，再打开App。

*****************************************

[rewrite_local]

^http:\/\/getway\.radio\.cn url script-response-body https://raw.githubusercontent.com/chxm1023/script/main/Rewrite/yunting.js

^https:\/\/ytapi\.radio\.cn url script-response-body https://raw.githubusercontent.com/chxm1023/script/main/Rewrite/yunting.js


[mitm] 

hostname = *.radio.cn

****************************************/


const getway = "/getway.radio.cn";
const ytapi = "/ytapi.radio.cn";

if ($request.url.indexOf(getway) != -1){body = $response.body.replace(/\"isVip":\d+/g, '\"isVip":0').replace(/\"needPay":\d+/g, '\"needPay":0').replace(/\"songVirtualPrice":\d+/g, '\"songVirtualPrice":0').replace(/\"songNeedPay":\d+/g, '\"songNeedPay":0');}

if ($request.url.indexOf(ytapi) != -1){body = $response.body.replace(/\"vipTime":"(.*?)"/g,'\"vipTime":"2099-09-09"');}

$done({body});
