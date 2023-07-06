/*
app下载地址：商店搜索：番薯小说(2022-08-10)
^https?:\/\/ggs\.manmeng168\.com\/v1\/(user\/info|ios/user/info) url script-response-body https://raw.githubusercontent.com/lutqhysky/quantumultx/mylove/fanshuxiaoshu/Script/fanshuxiaoshu.js
MITM = ggs.manmeng168.com
作者：清清情
*/

var body = $response.body;
var url = $request.url;
var obj = JSON.parse(body);

const vip = '/v1/user/info?';
const buy = '/v1/ios/user/info?';
if (url.indexOf(vip) != -1) {
    obj.data.vip = true;
    obj.data.vip_end_time = 4100731932000;
    body = JSON.stringify(obj);
}
if (url.indexOf(buy) != -1) {
    obj.data.userInfo.vip = true;
    obj.data.userInf.vip_end_time = 4100731932000;
    body = JSON.stringify(obj);
}
$done({body});
