var body = $response.body.replace(/vip_level":\d+/g, 'vip_level":1').replace(/hd":\w+/g, 'hd":true');
$done({body});
