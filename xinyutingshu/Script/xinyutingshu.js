/*
app下载地址：心语听书
^https?:\/\/i\.xinyulib\.com\.cn\/api\/querytoken url script-response-body https://raw.githubusercontent.com/lutqhysky/quantumultx/mylove/xinyutingshu/Script/xinyutingshu.js
MITM =i.xinyulib.com.cn
作者：清清情
*/

var body = $response.body;
var url = $request.url;
var obj = JSON.parse(body);

const vip = '/api/querytoken';

if (url.indexOf(vip) != -1) {
    obj.data.vipendtime = "2029-05-31";   
    body = JSON.stringify(obj);    
}
$done({body});
