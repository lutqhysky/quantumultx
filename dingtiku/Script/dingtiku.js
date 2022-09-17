var body = $response.body.replace(/isBuy":\d+/g, 'isBuy":1').replace(/allowTry":".*?"/g, 'allowTry":"是"');
$done({body});
