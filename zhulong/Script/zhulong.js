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
     obj.result.vip_type = 1;
     body = JSON.stringify(obj);
 }
 if (url.indexOf(down) != -1) {
     obj.result.can_down = 1;
     body = JSON.stringify(obj);
 }
 $done({body});
