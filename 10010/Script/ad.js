var body = $response.body;
var lutqhysky = JSON.parse(body);
const ada = '/mall-order/query/newFirstPage';
if ($request.url.indexOf(ada) != -1){
  lutqhysky.data = {};
}
$done({body : JSON.stringify(lutqhysky)});
