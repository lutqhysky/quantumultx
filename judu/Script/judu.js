/*
app下载地址：商店搜索：句读
^https?:\/\/judouapp\.com\/api\/v2\/mine\/profile url script-response-body zhulong.js
MITM = judouapp.com
作者：清清情
*/

var body = $response.body;
var url = $request.url;
var obj = JSON.parse(body);

const vip = '/api/v2/mine/profile';


if (url.indexOf(vip) != -1) {
    obj.is_member = true;
    obj.is_admin = true;
    obj.is_year_member = true;
    obj.member_expired_at = 9876543210;
    body = JSON.stringify(obj);
    
}
$done({body});
