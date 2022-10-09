url = $request.url;
let obj = JSON.parse($response.body);
 obj={
  "osVersion" : "15.1.1",
  "lastDeviceId" : "00000000-0000-0000-0000-000000000000",
  "packageId" : "one_year_VIP_trial",
  "vipExpireDate" : "2099-10-12",
  "_instanceName" : "1,816,654 (+86)",
  "registerUuid" : "B36259F6-487C-4917-9E98-DE056931ED8C",
  "countryCode" : "86",
  "deleted" : false,
  "storageSize" : 0,
  "deviceToken" : "00000000-0000-0000-0000-000000000000",
  "loginSubChannel" : "IOS",
  "remoteIp" : "117.188.185.233",
  "regChannel" : "IOS",
  "loginChannel" : "IOS",
  "id" : 1816654,
  "clientVersion" : "1.7.7",
  "totalPayAmount" : 0,
  "lastLoginTime" : "2022-10-09T19:41:19.164",
  "deviceModel" : "iPhone14,3",
  "trialed" : true,
  "vip" : true,
  "createTime" : "2022-10-09T19:39:00",
  "regSubChannel" : "IOS"
};
$done({body:JSON.stringify(obj)});
