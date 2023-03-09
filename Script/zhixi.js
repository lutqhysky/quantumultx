var body = $response.body.replace(/expire_time":"\d+/g, 'expire_time":6678337347').replace(/reg_type":\d+/g, 'reg_type":1').replace(/verified":\d+/g, 'verified":1');
$done({ body });
