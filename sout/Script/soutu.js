var body = $response.body.replace(/vip_end":".*?"/g, 'vip_end":"2099/12/12"').replace(/nickname":".*?"/g, 'nickname":"清清情"').replace(/mission_sign_in":\w+/g, 'mission_sign_in":true');
$done({body});
