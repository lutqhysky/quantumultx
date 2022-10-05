url = $request.url;
let obj = JSON.parse($response.body);
 obj= {
  "code" : 200,
  "data" : {
    "gender" : 2,
    "had_vip" : true,
    "vip_type" : "temporary",
    "id" : 571268,
    "last_login" : "2022-10-04 12:31:29",
    "is_device_user" : true,
    "head" : "https://thirdwx.qlogo.cn/mmopen/vi_32/1r66gSheha0tzHOx5jKxHiauy8oerwZHjYQ3esIYcMH9yjQSEPsd5WT54sBwFibU4xDBc4Jwxo2NZjicGUwg8sqbg/132",
    "vip_expire" : "2029-11-03 14:09:32",
    "name" : "清清情"
  },
  "msg" : "ok",
  "t" : "2022-10-04 14:20:39"
} ;
$done({body:JSON.stringify(obj)});
