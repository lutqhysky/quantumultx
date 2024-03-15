var body = $response.body.replace(/is_vip": \d+/g, 'is_vip": 1').replace(/is_jiahao": "\d+"/g, 'is_jiahao": "1"').replace(/vip_time": ".*?"/g, 'vip_time": "2099年"').replace(/is_weidu":\d+/g, 'is_weidu": 1').replace(/is_fabu":\d+/g, 'is_fabu": 1');
$done({body});
