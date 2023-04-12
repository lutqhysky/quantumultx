 var body = $response.body;
 var url = $request.url;
 var obj = JSON.parse(body);
 const vip = '/ucenter/prod-api/personal/myinfo/getUserInfo';
 const buy = '/edu/prod-api/lesson/lesson/getScheduleByLessonId';
 const bought = '/ucenter/prod-api/personal/History/lessonview';
 const buybuy = '/edu/prod-api/lesson/lesson/getLesson';
 const play = '/edu/prod-api/lesson/lesson/play';
 const down = '/bbs/prod-api/thread/thread/getThreadForTid';
 if (url.indexOf(vip) != -1) {
     obj.result.is_vip = 1;
     body = JSON.stringify(obj);
 }
 if (url.indexOf(buy) != -1) {
     obj.result.is_buy = 1;
     body = JSON.stringify(obj);
 }
 if (url.indexOf(bought) != -1) {
     obj.result.list.is_buy = 1;
     body = JSON.stringify(obj);
 }
 if (url.indexOf(buybuy) != -1) {
     obj.result.lesson_info.is_vip = 1;
     obj.result.is_buy = 1;
     obj.result.vip_level = 1;
     body = JSON.stringify(obj);
 }
 if (url.indexOf(play) != -1) {
     obj.result.is_vip = 1;
     obj.result.is_buy = 1;
     body = JSON.stringify(obj);
 }
 if (url.indexOf(down) != -1) {
     obj.result.can_down = 1;
     body = JSON.stringify(obj);
 }
 $done({body});

var body = $response.body.replace(/bookShelfId":\d+/g, 'bookShelfId":1').replace(/vipLevel":\d+/g, 'vipLevel":8').replace(/userVflag":\d+/g, 'userVflag":1').replace(/vipValid":\w+/g, 'vipValid":true').replace(/vip":\w+/g, 'vip":true').replace(/buySingleMagazine":\w+/g, 'buySingleMagazine":true').replace(/subscribe":\d+/g, 'subscribe":1').replace(/memberFlag":\d+/g, 'memberFlag":1').replace(/readPermission":\w+/g, 'readPermission":true').replace(/subscribeState":\d+/g, 'subscribeState":1').replace(/feeType":\d+/g, 'feeType":2').replace(/vipExpiration":".*?"/g, 'vipExpiration":"2099-12-12"').replace(/hasZhuanfaYinyong":\w+/g, 'hasZhuanfaYinyong":true').replace(/time":\d+/g, 'time":0');
$done({ body });

