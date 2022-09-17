var body = $response.body.replace(/isBuy":\d+/g, 'isBuy":1').replace(/allowTry":"否"/g, 'allowTry":"是"').replace(/code":"\d+"/g, 'code":"00"');
$done({body});

