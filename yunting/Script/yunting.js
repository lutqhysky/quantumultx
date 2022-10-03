/*
Unlocks by 清清情

ulr 匹配路径 http://getway.radio.cn/app*
*/
var body = $response.body.replace(/isVip":1/g, 'isVip":0').replace(/expire":\d+/g, 'expire":0').replace(/isPurchased":\w+/g, 'isPurchased":1').replace(/needPay":\w+/g, 'needPay":0').replace(/isSubscribe":\w+/g, 'isSubscribe":1').replace(/needPay":\w+/g, 'needPay":0');
$done({ body });
