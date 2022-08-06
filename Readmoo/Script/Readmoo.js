/* 
 app下载地址：商店搜索：Readmoo 时间 ：2022-08-01 
 ^https?:\/\/api\.readmoo\.com\/store\/v3\/books\/210000175000101\/reviews$ url script-response-body https://raw.githubusercontent.com/lutqhysky/quantumultx/mylove/Readmoo/Script/Readmoo.js
 MITM = api.readmoo.com
 作者：清清情 
 */ 

var body = $response.body;
var obj = JSON.parse(body);

obj.subscribable = true;
body = JSON.stringify(obj);
$done({body}); 
