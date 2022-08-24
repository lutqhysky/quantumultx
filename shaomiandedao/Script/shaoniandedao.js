/* 
 app下载地址：少年得到
  MITM = igetcool-gateway.igetcool.com
 ^https?:\/\/igetcool-gateway\.igetcool\.com\/(app-api-user-server\/oath\/user\/info\.json|app-api-product-server\/option\/course\/audios\.json|app-api-product-server\/white\/course\/videos\.json) url response-body https://raw.githubusercontent.com/lutqhysky/quantumultx/mylove/Vister/Script/Vister.js
 作者：清清情
 下面，不用一级一级的去找了，直接像网球锤子，替换就可以了。。。！！！！
 https://igetcool-gateway.igetcool.com/app-api-user-server/oath/user/info.json
 https://igetcool-gateway.igetcool.com/app-api-product-server/option/course/audios.json
 https://igetcool-gateway.igetcool.com/app-api-product-server/white/course/videos.json
 body = $response.body.replace(/hasPay":0/g, 'hasPay":1').replace(/userTag":0/g, 'userTag":1').replace(/audioActivityLockStatus":\d{1}/g, 'audioActivityLockStatus":2').replace(/buy":0/g, 'buy":1').replace(/free":0/g, 'free":1');
 */ 
body = $response.body.replace(/hasPay":0/g, 'hasPay":1').replace(/userTag":0/g, 'userTag":1').replace(/audioActivityLockStatus":\d{1}/g, 'audioActivityLockStatus":2').replace(/buy":0/g, 'buy":1').replace(/free":0/g, 'free":1');
$done({body});
