var body = $response.body.replace(/isFree":\d+/g, 'isFree":1');
$done({body});
