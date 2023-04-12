/* 
 https:\/\/apis\.lifeweek\.com\.cn\/zhuanlan\/zhuanlanV50305\.do 
 */ 


const zhuanlan = "/zhuanlan/zhuanlanV50305.do";
let obj = JSON.parse($response.body);

 if ($request.url.indexOf(zhuanlan) != -1) {
 body = $response.body.replace(/isSubscribed\":\w+/g, 'isSubscribed":true')
                      .replace(/vipe\":\w+/g, 'vip":true')
                      .replace(/vipValid\":\w+/g, 'vipValid":true')
                      .replace(/subscribeState\":\d+/g, 'subscribeState":1')
                      .replace(/feeType\":\d+/g, 'feeType":0')
$done({body});
 }
$done({body:JSON.stringify(obj)});


