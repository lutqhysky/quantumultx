/*
app下载地址：麦秸TV
^https?:\/\/api\.maijitv\.com\/(mes|urm)\/(mesIosRechargeList|queryMesUserInfo|getUserInfo) url script-response-body https://raw.githubusercontent.com/lutqhysky/quantumultx/mylove/maijietv/Script/maijietv.js
MITM =api.maijitv.com
作者：清清情
*/

var body = $response.body;
var url = $request.url;
var obj = JSON.parse(body);

const vip = '/mes/mesIosRechargeList';
const buy = '/mes/queryMesUserInfo';
const bought = '/urm/getUserInfo';

if (url.indexOf(vip) != -1) {
     obj.body.expireTime = 2099-08-09;
     obj.body.mesLev = 9;
     obj.body.isVip = 1;
     body = JSON.stringify(obj);    
}
 if (url.indexOf(buy) != -1) {
     obj.body.isVip = 1;
     body = JSON.stringify(obj);    
}
if (url.indexOf(bought) != -1) {
     obj.body.status = 1;
     body = JSON.stringify(obj);    
}
$done({body});
