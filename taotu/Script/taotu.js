var body = $response.body.replace(/vip_level":\d+/g, 'vip_level":1').replace(/picSource":\d+/g, 'picSource":0') .replace(/hd":\w+/g, 'hd":true');
$done({body});