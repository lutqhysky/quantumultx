var body = $response.body;
var url = $request.url;
var obj = JSON.parse(body);
const lock = '/api/v1/whole/bannerInfo';

if (url.indexOf(lock) != -1) {
   body = $response.body.replace(/"is_unlock":\d+/g, "\"is_unlock\":3")
$done({body});
}
$done({body});
