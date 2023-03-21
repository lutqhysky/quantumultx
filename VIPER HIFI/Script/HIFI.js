/*
https:\/\/viperhifi\.kugou\.com\/v1\/hifi\/membership\/vipinfo
*/

var body = $response.body;
var url = $request.url;
var obj = JSON.parse(body);

const vip = '/v1/hifi/membership/vipinfo';
if (url.indexOf(vip) != -1) {
obj.data.end_time = "2099-12-12 10:23:49";
obj.data.have_paid = true;
obj.data.is_vip = 1;  
    body = JSON.stringify(obj);    
}
$done({body});
