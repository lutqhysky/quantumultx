/* 
 https:\/\/apis\.lifeweek\.com\.cn\/zhuanlan\/zhuanlanV50305\.do 
 */ 


var body = $response.body;
 var url = $request.url;
 var obj = JSON.parse(body);
 const zhuanlan = '/zhuanlan/zhuanlanV50305.do';

 if (url.indexOf(zhuanlan) != -1) {
     obj.model.zhuanlan.isSubscribed = true;
     obj.model.zhuanlan.vip = true;
     obj.model.zhuanlan.vipValid = true;
     obj.model.zhuanlan.subscribeState = 1;
     body = JSON.stringify(obj);
 }
$done({body});


