/* 
 app下载地址：商店搜索：西窗烛 时间 ：2022-08-08 
 ^https?:\/\/lchttpapi.xczim.com url script-response-body https://raw.githubusercontent.com/lutqhysky/Surge/Mylove/xichuangzhu/Script/xichuangzhu.js?token=GHSAT0AAAAAABXAVOA4PE5C2EN4KKORUKG2YXQU44Q
 MITM = *.xczim.com
 作者：清清情 
 */ 
 var body = $response.body; 
 var url = $request.url; 
 var obj = JSON.parse(body); 
 const vip = '/1.1/users'; 
 if (url.indexOf(buy) != -1) { 
    obj.membership = true; 
    obj.premiumMembership = true; 
    obj.isAdmin = true;
    obj.lifetimeMembership = true;
    obj.avatarReviewState = 1;
    body = JSON.stringify(obj);  
 } 
 $done({body}); 
