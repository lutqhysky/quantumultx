var body = $response.body.replace(/isVip":\d+/g, 'isVip":0').replace(/isCanListen":\d+/g, 'isCanListen":1').replace(/isFree":\d+/g, 'isFree":1').replace(/isBuy":\d+/g, 'isBuy":1');
$done({body});
