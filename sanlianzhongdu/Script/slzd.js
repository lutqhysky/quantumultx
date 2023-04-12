/* 
 https:\/\/apis\.lifeweek\.com\.cn\/zhuanlan\/zhuanlanV50305\.do 
 https:\/\/apis\.lifeweek\.com\.cn\/api\/appDistribution\/distributionPoster
*/ 


const zhuanlan = "/zhuanlan/zhuanlanV50305.do";
const bqc = "/api/appDistribution/distributionPoster";
let obj = JSON.parse($response.body);

 if ($request.url.indexOf(zhuanlan) != -1) {
 body = $response.body.replace(/isSubscribed\":\w+/g, 'isSubscribed":true')
                      .replace(/vipe\":\w+/g, 'vip":true')
                      .replace(/vipValid\":\w+/g, 'vipValid":true')
                      .replace(/subscribeState\":\d+/g, 'subscribeState":1')
                      .replace(/feeType\":\d+/g, 'feeType":0')
                      .replace(/type\":\d+/g, 'type":4')
                      .replace(/zhunalanSubscribe\":\w+/g, 'zhunalanSubscribe":true')
$done({body});
 }
if ($request.url.indexOf(bqc) != -1) {
obj.model.userVflag = 1
 }
$done({body:JSON.stringify(obj)});


