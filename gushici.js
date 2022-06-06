/*
app下载地址：商店搜索：知音漫客
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
    body = JSON.stringify(obj);
    
}
$done({body});

