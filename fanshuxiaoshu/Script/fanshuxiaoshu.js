/*
app下载地址：商店搜索：番薯小说
^https?:\/\/ggs\.manmeng168\.com\/v1\/user\/info url script-response-body https://raw.githubusercontent.com/lutqhysky/quantumultx/mylove/gushichi/Script/gushici.js
MITM = ggs.manmeng168.com
作者：清清情
*/

var body = $response.body;
var url = $request.url;
var obj = JSON.parse(body);

const vip = '/v1/user/info?';

if (url.indexOf(vip) != -1) {
    obj.data.vip = true;
    obj.data.vip_end_time = 9876543210;
    body = JSON.stringify(obj);
}
$done({body});
