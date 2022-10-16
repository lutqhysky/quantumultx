const path1 = "/api/v2.user/appLaunchWithUser";
let obj = JSON.parse($response.body);
if ($request.url.indexOf(path1) != -1){
obj.value.vip = {
      "id" : 999999,
      "boughtType" : "new",
      "createdTime" : 1586253524,
      "boughtUnit" : "year",
      "levelId" : 2,
      "userId" : 9999999,
      "boughtTime" : 1586253524,
      "boughtDuration" : 10,
      "orderId" : 999999,
      "operatorId" : 0,
      "level" : {
        "id" : 2,
        "description" : "",
        "recognizeTranslateAll" : 1,
        "recognizeBatch" : -100,
        "createdTime" : 1429260383,
        "maxRate" : 100,
        "picture" : "",
        "seq" : 2,
        "monthPrice" : 0.02,
        "recognizeTranslate" : -100,
        "icon" : "",
        "yearPrice" : 30,
        "enabled" : 1,
        "gived" : 0,
        "name" : "黄金会员",
        "recognizeNormal" : -100
      },
      "deadlineNotified" : 0,
      "deadline" : 9999986324,
      "boughtAmount" : 30
};
$done({body: JSON.stringify(obj)});
