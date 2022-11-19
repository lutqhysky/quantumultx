 var body = $response.body; 
 var url = $request.url; 
 var obj = JSON.parse(body); 

 const vip = '/1.1/users'; 
 const buy = '/1.1/functions/checkDidBoughtBook'; 
 const bought = '/1.1/functions/receiveBookCollectionByProUser'; 
 const Coins = '/1.1/functions/getMyCoins'; 
 const Font = '/1.1/functions/buyFont'; 
 const sound = "/1.1/call/getXTTracksByAlbum";
const XTAlbumIsBought = "/1.1/functions/checkXTAlbumIsBought";

if (url.indexOf(vip) != -1) { 
    obj.membership = true; 
    obj.premiumMembership = true; 
    obj.isAdmin = true;
    obj.lifetimeMembership = true;
    obj.avatarReviewState = 1;
    body = JSON.stringify(obj);  
 } 
 if (url.indexOf(buy) != -1) { 
    obj.result = true; 
    body = JSON.stringify(obj);  
 } 
 if (url.indexOf(bought) != -1) { 
    obj.code = 0; 
    body = JSON.stringify(obj);  
 } 
  if (url.indexOf(Coins) != -1) { 
    obj.result.tippedCoins = 10000;
    obj.result.androidCoins = 10000;
    obj.result.money = 10000;
    obj.result.iosCoins = 10000;
    body = JSON.stringify(obj);  
 } 
 if (url.indexOf(Font) != -1) { 
    obj.code = 0;
    obj.error = "null";
    body = JSON.stringify(obj);  
 } 
if (url.indexOf(sound) != -1) { 
    obj.result["isPaid"] = true;
    body = JSON.stringify(obj);  
 } 

if (url.indexOf(XTAlbumIsBought) != -1) { 
    obj.result = true;
    body = JSON.stringify(obj);  
 } 
$done({body}); 
