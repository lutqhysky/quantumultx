/*
app下载地址：商店搜索：少儿趣配音
^https?:\/\/childapi40.qupeiyin.com url script-response-body seqpy.js
MITM = *.qupeiyin.com
作者：清清情  时间2022年6月6日
*/

var body = $response.body;
var url = $request.url;
var obj = JSON.parse(body);

const vip = '/member';
const vip2 = '/member';

if (url.indexOf(vip) != -1) {
    obj.data.is_svip = "1";
    obj.data.is_vip = "1";
    obj.data.svip_endtime = "9999999999";
    obj.data.vip_endtime = "9999999999";
    body = JSON.stringify(obj);
    
}
if (url.indexOf(vip2) != -1) {
    obj.data.is_vip = "1";
    body = JSON.stringify(obj);
    
}
$done({body});

