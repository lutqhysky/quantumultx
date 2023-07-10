var body = $response.body;
var url = $request.url;
var obj = JSON.parse(body);
const vip = '/api/v2/mine/profile';
if (url.indexOf(vip) != -1) {
    obj.is_member = true;
    obj.is_admin = true;
    obj.is_year_member = true;
    obj.member_expired_at = 4100747967;
    body = JSON.stringify(obj);
}
$done({body});
