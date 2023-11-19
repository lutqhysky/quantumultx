var body = $response.body;
var lutqhysky = JSON.parse(body);
const ada = '/user/info';
if ($request.url.indexOf(ada) != -1){
  lutqhysky.data.isVip = 1;
  lutqhysky.data.vipExpire = 9876543210;
}
$done({body : JSON.stringify(lutqhysky)});