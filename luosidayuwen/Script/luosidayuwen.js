/***********************************
> 應用名稱：螺丝大语文
 
[rewrite_local]
#螺丝大语文（2022-08-20）
https?:\/\/api8\.luosijiaoyu\.com\/api\/(HZLSJY20200817Controller\/selectFMVideoById\.html|LsjyMyContoller\/selectUserInfo\.html) url script-response-body https://raw.githubusercontent.com/ddgksf2013/Cuttlefish/master/Crack/elabook.js
[mitm] 
hostname=api8.luosijiaoyu.com
***********************************/
 var body = $response.body; 
 var url = $request.url; 
 var obj = JSON.parse(body); 
  const buy = '/api/HZLSJY20200817Controller/selectFMVideoById.html'; 
 const bought = '/api/LsjyMyContoller/selectUserInfo.html'; 
 
  if (url.indexOf(buy) != -1) { 
     obj.rows.vip = true;
     obj.rows.buyVip = true;
 body = JSON.stringify(obj);  
 } 
 if (url.indexOf(bought) != -1) { 
     obj.rows.vip = true;
     obj.rows.days = "666";
 body = JSON.stringify(obj);  
 } 
 $done({body}); 
