/*
黄油相机 2022-9-4

^https:\/\/api4\.bybutter\.com\/v4\/(users|shop) url script-response-body https://raw.githubusercontent.com/lutqhysky/quantumultx/mylove/hyxj/Script/hyxj.js

hostname：api4.bybutter.com

*/

const path1 = "/v4/(users|shop)";
let obj = JSON.parse($response.body);
if ($request.url.indexOf(path1) != -1){
obj.memberships = [{
    "endAt": 1977890679,
    "id": "1",
    "name": "普通会员",
    "ownership": "temporary",
    "startAt": 1662268511,
    "usageType": "unlimited"
  }]
}
$done({body: JSON.stringify(obj)});
