const ytapi = "ytapi.radio.cn/ytsrv/srv/appUser/getUserInfoH5";
if ($request.url.indexOf(ytapi) != -1){body = $response.body.replace(/\"vipTime":"(.*?)"/g,'\"vipTime":"2099-10-23"');}
$done({body})
