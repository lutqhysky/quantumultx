var body = $response.body.replace(/nickname":".*?"/g, 'nickname":"清清情"').replace(/dead_time":\d+/g, 'dead_time":2663414708').replace(/isvip":\d+/g, 'isvip": 1').replace(/username":".*?"/g, 'username": "尊贵VIP"');
$done({body});
