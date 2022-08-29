/*
app下载地址：商店搜索：小小优趣
^https?:\/\/(prod|fastapi)\.ukids\.cn\/(uch5\/getUser|coreapp\/classOqd\/course\/detail)url script-response-body https://raw.githubusercontent.com/lutqhysky/quantumultx/mylove/gushichi/Script/gushici.js
MITM =*.ukids.cn
作者：清清情
*/
var body = $response.body; 
var url = $request.url; 
var obj = JSON.parse(body); 
const vip = '/uch5/getUser';
if (url.indexOf(vip) != -1) {
    obj.data.vip = 1;
    obj.data.vipReal = 1;
    obj.data.svip = 1;
    obj.data.vipEnd = "2029-09-02";
    obj.data.vipEndReal = "2029-09-02";
    obj.data.svipEnd = "2029-09-02";
    obj.data.type = 2;
    obj.data.typeReal = 2;
    obj.data.vipTotal = 987654321;
    obj.data.svipTotal = 987654321;    
    obj.data.vipEffect = 987654321;     
    obj.data.svipEffect = 987654321;
    body = JSON.stringify(obj);
}
$done({body});
