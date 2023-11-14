var body = $response.body;
var lutqhysky = JSON.parse(body);
const ada = '/api/v1/ads';
if ($request.url.indexOf(ada) != -1){
  lutqhysky.data.ads = {};
}
$done({body : JSON.stringify(lutqhysky)});
