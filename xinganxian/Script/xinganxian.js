
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
