var body = $response.body;
var url = $request.url;
var obj = JSON.parse(body);
const vip = '/api\/v1\/user\/info';
const lock = '/api/v1/whole/bannerInfo';


if (url.indexOf(svip) != -1) {
    obj.data.vip_inf =  {"id":470,"uid":13694,"c_time":"2023-04-03 13:41:28","e_time":"2099-04-06 13:41:28","date_v":"2023-04-03","status":1,"vip_type":"永久会员","u_time":"2023-04-03 13:41:28","vip_type_note":"永久会员","e_time_int":4100737288,"e_time_day":"2099-12-12","vip_end_status":1};
    body = JSON.stringify(obj);
}
if (url.indexOf(lock) != -1) {
   body = $response.body.replace(/"is_unlock":\d+/g, "\"is_unlock\":1")
$done({body});
}
$done({body});
