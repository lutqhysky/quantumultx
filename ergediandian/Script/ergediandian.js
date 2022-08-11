/*
Unlocks by Cuttlefish 公众号：墨鱼手记
http:\/\/gateway\.ergedd\.com\/dduser\/user\/center\/set
*/
var body = $response.body.replace(/vip":0/g, 'vip":1').replace(/vip_endtime":"0/g, 'vip_endtime":"1800000000')
$done({ body });
