var body = $response.body; 
var url = $request.url; 
var obj = JSON.parse(body); 
const Vipdate = 'api/user/profile';
const vip = 'api/（notifications|stations)';
if (url.indexOf(Vipdate) != -1) { 
    obj.data.__v = 1;
    obj.data.ispremium = true;
    obj.data.ispremiumexpired = false;
    obj.data.premiumexpiretime = "2099-12-12T01:10:10.736Z";
    obj.data.haspremiumhistory = true;
 body = JSON.stringify(obj);  
 } 
if ($request.url.indexOf(getway) != -1){
    body = $response.body.replace(/\"__v":\d+/g, '\"__v":1');
}
$done({body}); 
