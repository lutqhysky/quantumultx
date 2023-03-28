var body = $response.body;
var url = $request.url;
var obj = JSON.parse(body);
const vip = '/member';
if (url.indexOf(vip) != -1) {
    obj.data.is_svip = "1";
    obj.data.is_vip = "1";
    obj.data.svip_endtime = "1891758867";
    obj.data.vip_endtime = "1891758867";
    obj.data.libu_vip_endtime = "1891758867";
    body = JSON.stringify(obj);

}

$done({
    body
});
