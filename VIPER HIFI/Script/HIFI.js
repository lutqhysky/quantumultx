/*
^https?:\/\/(viperhifi|media\.store)\.kugou\.com\/v1\/(hifi\/membership\/vipinfo|membership\/vipuser|get_res_privilege)
*/

var body = $response.body;
var url = $request.url;
var obj = JSON.parse(body);

const vip = '/v1/hifi/membership/vipinfo';
const Vip = 'v1/membership/vipuser';
const song = 'v1/get_res_privilege';
if (url.indexOf(vip) != -1) {
    obj.data.end_time = "2099-12-12 10:23:49";
    obj.data.have_paid = true;
    obj.data.is_vip = 1;
    body = JSON.stringify(obj);
}
if (url.indexOf(Vip) != -1) {
    obj.data.end_time = "2099-12-12 10:23:49";
    obj.data.is_vip = 1;
    body = JSON.stringify(obj);
}
if (url.indexOf(song) != -1) {
    obj["data"]["rebuy_pay_type"] = 3;
    obj["data"]["buy_count_vip"] = 1;
    body = JSON.stringify(obj);
}
$done({body});
