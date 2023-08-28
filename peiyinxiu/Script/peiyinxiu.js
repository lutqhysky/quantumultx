var body = $response.body;
var url = $request.url;
var obj = JSON.parse(body);

const vip = '/Api/user/GetMyInfo';
const vip2 = '/api/User/GetVipDetail';
if (url.indexOf(vip) != -1) {
    obj.data.is_vip = 1;
    obj.data.gold = 999999;
    obj.data.vip_end_time = "2099年12月12日";
    obj.data.gold2 = 999999;
    obj.data.is_can_apply = 1;
    body = JSON.stringify(obj);
}
if (url.indexOf(vip2) != -1) {
    obj.data.is_vip = 1;
    obj.data.isRenewal = 1;
    obj.data.vip_end_time = "2099年12月12日";
    obj.data.is_can_apply = 1;
    obj.data.tools.status = 1;
    body = JSON.stringify(obj);
}
$done({body});
