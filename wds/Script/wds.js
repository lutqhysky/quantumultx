var body = $response.body.replace(/IsVip":\d+/g, 'IsVip":1').replace(/ExpTime":".*?"/g, 'ExpTime":"\/Date(4100747856000)\/"').replace(/VipType":\d+/g, 'VipType":5').replace(/IsBuy":\d+/g, 'IsBuy":1').replace(/Money":\d+/g, 'Money":10000');
$done({ body });
