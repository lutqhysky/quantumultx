var body = $response.body;
var url = $request.url;
var obj = JSON.parse(body);

const vip = '/api/ucenter/v1/wechat/login';

if (url.indexOf(vip) != -1) {
obj.res.token.expire_time = 6678351568;
obj.res.userinfo.verified = 1; 
obj.res.userinfo.reg_type = 1;  
    body = JSON.stringify(obj);    
}
$done({body});
