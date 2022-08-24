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
body = $response.body.\u0072\u0065\u0070\u006c\u0061\u0063\u0065\u0028\u002f\u0068\u0061\u0073\u0050\u0061\u0079\u0022\u003a\u0030\u002f\u0067\u002c\u0020\u0027\u0068\u0061\u0073\u0050\u0061\u0079\u0022\u003a\u0031\u0027\u0029\u002e\u0072\u0065\u0070\u006c\u0061\u0063\u0065\u0028\u002f\u0075\u0073\u0065\u0072\u0054\u0061\u0067\u0022\u003a\u0030\u002f\u0067\u002c\u0020\u0027\u0075\u0073\u0065\u0072\u0054\u0061\u0067\u0022\u003a\u0031\u0027\u0029\u002e\u0072\u0065\u0070\u006c\u0061\u0063\u0065\u0028\u002f\u0061\u0075\u0064\u0069\u006f\u0041\u0063\u0074\u0069\u0076\u0069\u0074\u0079\u004c\u006f\u0063\u006b\u0053\u0074\u0061\u0074\u0075\u0073\u0022\u003a\u0025\u0064\u007b\u0031\u007d\u002f\u0067\u002c\u0020\u0027\u0061\u0075\u0064\u0069\u006f\u0041\u0063\u0074\u0069\u0076\u0069\u0074\u0079\u004c\u006f\u0063\u006b\u0053\u0074\u0061\u0074\u0075\u0073\u0022\u003a\u0032\u0027\u0029\u002e\u0072\u0065\u0070\u006c\u0061\u0063\u0065\u0028\u002f\u0062\u0075\u0079\u0022\u003a\u0030\u002f\u0067\u002c\u0020\u0027\u0062\u0075\u0079\u0022\u003a\u0031\u0027\u0029\u002e\u0072\u0065\u0070\u006c\u0061\u0063\u0065\u0028\u002f\u0066\u0072\u0065\u0065\u0022\u003a\u0030\u002f\u0067\u002c\u0020\u0027\u0066\u0072\u0065\u0065\u0022\u003a\u0031\u0027\u0029;
$done({body});
