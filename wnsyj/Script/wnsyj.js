var body = $response.body; 
var url = $request.url; 
var obj = JSON.parse(body); 
const buy = 'api/user/profile';
const buy = 'api/notifications';
if (url.indexOf(buy) != -1) { 
    obj.data.__v = 1;
    obj.data.ispremium = true;
    obj.data.ispremiumexpired = false;
    obj.data.premiumexpiretime = "2099-01-18T01:10:10.736Z";
    obj.data.haspremiumhistory = true;
 body = JSON.stringify(obj);  
 } 
if (url.indexOf(buy) != -1) { 
    obj.data.__v = 1;
 body = JSON.stringify(obj);  
 } 
$done({body}); 
