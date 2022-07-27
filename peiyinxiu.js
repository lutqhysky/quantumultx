/*
app下载地址：商店搜索：配音秀
^https?:\/\/iosapi.peiyinxiu.com url script-response-body peiyinxiu.js
MITM = *.peiyinxiu.com
作者：清清情
*/

var body = $response.body;
var url = $request.url;
var obj = JSON.parse(body);

const vip = 'api/User';

if (url.indexOf(vip) != -1) {
    obj.data.is_vip = 1;
    obj.data.gold = 1;
    obj.data.vip_end_time = 9999999999000;
    obj.data.gold2 = 1;
    obj.data.is_can_apply = 1;
    body = JSON.stringify(obj);
    
}

$done({body});

