https://recite.perfectlingo.com      /api/recite/            user            /info
https://recite.perfectlingo.com      /api/equity/            userequity      /v1/            get-user-equity


^https?:\/\/recite\.perfectlingo\.com\/api\/(equity|recite)\/(userequity|user)\/(v1|info)/get-user-equity
var body = $response.body.replace(/endTime":\d+/g, 'endTime":2662608155506').replace(/identifier":".*?"/g, 'identifier":"vip_flag"').replace(/identity_code":\d+/g, 'identity_code":4');
$done({body});
