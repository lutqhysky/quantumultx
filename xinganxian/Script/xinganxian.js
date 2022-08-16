/* 
 app下载地址：商店搜索：新干线 时间 ：2022-08-16 
 ^https?:\/\/api\.fwxgx\.com\/aggregation\/v1\/courses url script-response-body zhulong.js 
 MITM = api.fwxgx.com
 作者：清清情 
 */ 
 var body = $response.body; 
 var url = $request.url; 
 var obj = JSON.parse(body); 
 const buy = '/aggregation/v1/courses'; 

if (url.indexOf(buy) != -1) { 
    obj.bought = true; 
    obj.vip = true; 
    body = JSON.stringify(obj);  
} 
$done({body}); 
