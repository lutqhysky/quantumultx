/*
app下载地址：商店搜索：古诗词
^https?:\/\/gushici\.91iread\.com:8011\/api\/(user\/me|iap\/verifyorder) url script-response-body https://raw.githubusercontent.com/lutqhysky/quantumultx/mylove/gushichi/Script/gushici.js
MITM =gushici.91iread.com
作者：清清情
*/

var body = $response.body;
var url = $request.url;
var obj = JSON.parse(body);

const vip = '/api/user/me';
const buy = '/iap/verifyorder';
if (url.indexOf(vip) != -1) {
    obj.data.isVip = 1;
    body = JSON.stringify(obj);
}
if (url.indexOf(buy) != -1) {
    obj.data.isVip = 1;
    body = JSON.stringify(obj);
}
$done({body});
