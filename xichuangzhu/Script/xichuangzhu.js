/* 
 app下载地址：商店搜索：西窗烛 时间 ：2022-08-08 
 ^https?:\/\/lchttpapi.xczim.com\/1.1\/(users|functions/checkDidBoughtBook|functions/receiveBookCollectionByProUser) url script-response-body https://raw.githubusercontent.com/lutqhysky/quantumultx/mylove/xichuangzhu/Script/xichuangzhu.js
 MITM = *.xczim.com
 作者：清清情 
 */ 
 var body = $response.body; 
 var url = $request.url; 
 var obj = JSON.parse(body); 
 const vip = '/1.1/users'; 
 const buy = '/1.1/functions/checkDidBoughtBook'; 
 const bought = /1.1/functions/receiveBookCollectionByProUser'; 
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
 if (url.indexOf(buy) != -1) { 
    obj.code = 0; 
    body = JSON.stringify(obj);  
 } 
 $done({body}); 
