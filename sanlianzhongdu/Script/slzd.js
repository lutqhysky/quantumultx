/* 
 https:\/\/apis\.lifeweek\.com\.cn\/zhuanlan\/zhuanlanV50305\.do 
 */ 


var body = $response.body;
 var url = $request.url;
 var obj = JSON.parse(body);
 const zhuanlan = '/zhuanlan/zhuanlanV50305.do';

 if (url.indexOf(zhuanlan) != -1) {
     body = $response.body.replace(/"isSubscribed":\w+/g, "\"isSubscribed\":true")
                          .replace(/"vipe":\w+/g, "\"vip\":true")
                          .replace(/"vipValid":\w+/g, "\"vipValid\":true")
                          .replace(/"subscribeState":\d+/g, "\"subscribeState\":1")
                          .replace(/"vipValid":\w+/g, "\"vipValid\":true")
                          .replace(/"feeType":\d+/g, "\"feeType\":0")
$done({body});
 }
$done({body});


