var body = $response.body.replace(/vipEndDate":".*?"/g, 'vipEndDate":"9876543210000"').replace(/labelTypeValue":".*?"/g, 'labelTypeValue":""').replace(/isSubscribe":"0"/g, 'isSubscribe":"1"').replace(/isVip":\d+/g, 'isVip":0').replace(/isCanListen":\d+/g, 'isCanListen":1').replace(/isFree":\d+/g, 'isFree":1').replace(/isBuy":\d+/g, 'isBuy":1');
$done({body});
