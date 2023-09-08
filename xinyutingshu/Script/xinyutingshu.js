var body = $response.body;
var url = $request.url;
var obj = JSON.parse(body);

const vip = '/api/querytoken';

if (url.indexOf(vip) != -1) {
    obj.data.vipendtime = "2029-12-12";   
    body = JSON.stringify(obj);    
}
$done({body});
