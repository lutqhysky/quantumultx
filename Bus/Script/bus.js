var body = $response.body;
var lutqhysky = JSON.parse(body);
const ada = '/api/appClient/noAuth/publish/v1/getNoticeFromChannel';
if ($request.url.indexOf(ada) != -1){
  lutqhysky.data = [];
}
$done({body : JSON.stringify(lutqhysky)});