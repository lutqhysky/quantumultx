/*
^https?:\/\/api\.shaolinzen\.com\/user\/v1\/info$
*/

var body = $response.body;
var url = $request.url;
var obj = JSON.parse(body);

const vip = 'user/v1/info';
if (url.indexOf(vip) != -1) {
    obj.data.nickname = "52破解";
    obj.data.vipActive = true;
    obj.data.vipExpireTime = "2099年12月12日";
    body = JSON.stringify(obj);
}
$done({body});
