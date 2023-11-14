var body = $response.body.replace(/is_vip":\d+/g,'is_vip":1')
.replace(/vip_type":""/g,'vip_type":"vip"')
.replace(/vip_day":\d+/g,'vip_day":99999')
.replace(/vip_expire":""/g,'vip_expire":"终身VIP，会员永不"')
.replace(/vip_expire":null/g,'vip_expire":"终身VIP，会员永不"')
.replace(/nickname":".*?"/g,'nickname":"清清情"')
$done({ body });
