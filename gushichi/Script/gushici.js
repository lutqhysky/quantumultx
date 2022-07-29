/*
app下载地址：商店搜索：古诗词
^https?:\/\/gushici.91iread.com url script-response-body gushici.js
MITM =gushici.91iread.com
作者：清清情
*/

var body = $response.body;
var url = $request.url;
var obj = JSON.parse(body);

const vip = '/api/user/me';

if (url.indexOf(vip) != -1) {
    obj.data.isVip = 1;
    obj.data.vip_end_time = 9876543210000;
    body = JSON.stringify(obj);
    
}
$done({body});
