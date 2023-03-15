var body = $response.body.replace(/exp":".*?"/g, 'exp":"2099-12-12 16:00:26"').replace(/master_vip":\d+/g, 'master_vip":1').replace(/mobile_exp":".*?"/g, 'mobile_exp":"2099-12-12 16:00:26"').replace(/max_storage":\d+/g, 'max_storage":9073741824');
$done({ body });

