var body = $response.body.replace(/sysgid":\d+/g, 'sysgid":5').replace(/gicon":".*?"/g, 'gicon":"V5"').replace(/gid":\d+/g, 'gid": 5').replace(/dueday":".*?"/g, 'dueday": "尊贵VIP"').replace(/username":".*?"/g, 'username":"清清情"').replace(/isvip":\d+/g, 'isvip":1').replace(/gids":\d+/g, 'gids":5');
$done({body});
