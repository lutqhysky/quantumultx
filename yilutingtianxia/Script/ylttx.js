var body = $response.body.replace(/isFree":\d+/g, 'isFree":1').replace(/isBuy":\d+/g, 'isBuy":1');
$done({body});
