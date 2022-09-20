url = $request.url;
let obj = JSON.parse($response.body);

    obj={
  "code" : 200,
  "flag" : true,
  "data" : {
    "rights" : [
      {
        "icon" : "https://h5.t1678.com/core/attachment/preview?storeFilePath=test/2020/10/29/46160396711451385.png"
      },
      {
        "icon" : "https://h5.t1678.com/core/attachment/preview?storeFilePath=test/2020/10/29/93160396717617612.png"
      },
      {
        "icon" : "https://h5.t1678.com/core/attachment/preview?storeFilePath=test/2020/10/29/02160396722898870.png"
      },
      {
        "icon" : "https://h5.t1678.com/core/attachment/preview?storeFilePath=test/2020/10/29/98160396719998494.png"
      }
    ],
    "countDown" : "VIP剩395天23小时到期",
    "vipEndDate" : "2023-10-20 10:05:03"
  },
  "msg" : "成功",
  "timestamp" : 1663639516605
};
$done({body:JSON.stringify(obj)});
