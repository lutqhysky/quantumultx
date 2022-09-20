var body = $response.body.replace(/isBuy":\d+/g, 'isBuy":1').replace(/isCanListen":\d/g, 'isCanListen":1');
$done({body});
