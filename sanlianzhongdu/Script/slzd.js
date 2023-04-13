/* 
 https:\/\/apis\.lifeweek\.com\.cn\/zhuanlan\/zhuanlanV50305\.do 
 https:\/\/apis\.lifeweek\.com\.cn\/api\/appDistribution\/distributionPoster
*/ 


const zhuanlan = "/zhuanlan/zhuanlanV50305.do";
const bqc = "/api/appDistribution/distributionPoster";
const vip = "/article/detailV50305";
const ceshi = "/user/msgCount";
let obj = JSON.parse($response.body);

 if ($request.url.indexOf(zhuanlan) != -1) {
 body = $response.body.replace(/isSubscribed\":\w+/g, 'isSubscribed":true')
                      .replace(/vip\":\w+/g, 'vip":true')
                      .replace(/vipValid\":\w+/g, 'vipValid":true')
                      .replace(/subscribeState\":\d+/g, 'subscribeState":1')
                      .replace(/feeType\":\d+/g, 'feeType":4')
                      .replace(/type\":\d+/g, 'type":4')
                      .replace(/zhunalanSubscribe\":\w+/g, 'zhunalanSubscribe":true')
                      .replace(/readFlag\":\d+/g, 'readFlag":1')
                      .replace(/vipLevel\":\d+/g, 'vipLevel":1')
                      .replace(/bookShelfId\":\d+/g, 'bookShelfId":1')
                      .replace(/expireTime\":\d+/g, 'expireTime":4100739826000')
$done({body});
 }
if ($request.url.indexOf(bqc) != -1) {
obj.model.userVflag = 1
 }
if ($request.url.indexOf(vip) != -1) {
 body = $response.body.replace(/isSubscribed\":\w+/g, 'isSubscribed":true')
                      .replace(/vip\":\w+/g, 'vip":true')
                      .replace(/vipValid\":\w+/g, 'vipValid":true')
                      .replace(/subscribeState\":\d+/g, 'subscribeState":1')
                      .replace(/feeType\":\d+/g, 'feeType":0')
                      .replace(/type\":\d+/g, 'type":4')
                      .replace(/zhunalanSubscribe\":\w+/g, 'zhunalanSubscribe":true')
                      .replace(/vipExpiration\":".*?"/g, 'vipExpiration":"2099-12-12"')
                      .replace(/isZhuanlanSubscribed\":\w+/g, 'isZhuanlanSubscribed":true')
 $done({body});
 }
if ($request.url.indexOf(ceshi) != -1) {
obj.model.data = 1
 }
$done({body:JSON.stringify(obj)});


