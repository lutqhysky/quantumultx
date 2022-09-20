var body = $response.body.replace(/isSubscribe":"\d+"/g, 'isSubscribe":"1"').replace(/isBuy":\d+/g, 'isBuy":1').replace(/isCanListen":\d/g, 'isCanListen":1');
$done({body});
