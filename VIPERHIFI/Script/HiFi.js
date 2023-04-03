/*
^https?:\/\/(viperhifi|media\.store|login\.user)\.kugou\.com\/v\d+\/(hifi\/membership\/vipinfo|membership\/vipuser|get_res_privilege|login_by_token)
http://login.user.kugou.com/v5/login_by_token
*/

var body = $response.body;
var url = $request.url;
var obj = JSON.parse(body);
const svip = '/v5/login_by_token';
const vip = '/v1/hifi/membership/vipinfo';
const Vip = 'v1/membership/vipuser';
const song = 'v1/get_res_privilege';

if (url.indexOf(svip) != -1) {
    obj.data.su_vip_end_time = "2099-12-12 10:23:49";
    obj.data.vip_end_time = "2099-12-12 10:23:49";
    obj.data.vip_type = 3;
    obj.data.is_vip = 1;
    body = JSON.stringify(obj);
}
if (url.indexOf(vip) != -1) {
    obj.data.end_time = "2099-12-12 10:23:49";
    obj.data.have_paid = true;
    obj.data.is_vip = 1;
    obj.data.ios_expire_time = 4100722158;
    body = JSON.stringify(obj);
}
if (url.indexOf(Vip) != -1) {
    obj.data.end_time = "2099-12-12 10:23:49";
    obj.data.is_vip = 1;
    body = JSON.stringify(obj);
}
if (url.indexOf(song) != -1) {
   body = $response.body.replace(/"rebuy_pay_type":\d+/g, "\"rebuy_pay_type\":3")
                        .replace(/"buy_count_vip":\d+/g, "\"buy_count_vip\":1")
                        .replace(/"buy_count_audios":\d+/g, "\"buy_count_audios\":1")
                        .replace(/"buy_count_kubi":\d+/g, "\"buy_count_kubi\":1")
$done({body});
}
$done({body});
