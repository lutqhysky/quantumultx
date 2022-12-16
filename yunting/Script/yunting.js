var body = $response.body.replace(/isVip":1/g, 'isVip":0').replace(/expire":\d+/g, 'expire":0').replace(/isPurchased":\w+/g, 'isPurchased":1').replace(/needPay":\w+/g, 'needPay":0').replace(/isSubscribe":\w+/g, 'isSubscribe":1').replace(/needPay":\w+/g, 'needPay":0');
 $done({ body });
