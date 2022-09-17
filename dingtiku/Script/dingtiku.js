var body = $response.body.replace(/isBuy":\d+/g, 'isBuy":1').replace(/allowTry":".*?"/g, 'allowTry":"是"').replace(/isvip":\d+/g, 'isvip": 1').replace(/username":".*?"/g, 'username": "尊贵VIP"');
$done({body});
