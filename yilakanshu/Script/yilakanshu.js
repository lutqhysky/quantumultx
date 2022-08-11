/*
app下载地址：商店搜索：咿啦看书
^https?:\/\/bookapi\.ellabook\.cn\/rest\/api\/service url script-response-body https://raw.githubusercontent.com/lutqhysky/quantumultx/mylove/wenyuqupeiyin/Script/yuwenqupeiyin.js
MITM = bookapi.ellabook.cn
作者：清清情  时间2022年6月6日
*/

var body = $response.body;
var url = $request.url;
var obj = JSON.parse(body);

const vip = '/rest/api/service';

if (url.indexOf(vip) != -1) {
    obj.data.userInfo.userInfo.isLbVip = "YES";
    obj.data.userInfo.userInfo.is_svip = "YES";
    obj.data.userInfo.userInfo.is_vip = "YES";
    obj.data.userInfo.userInfo.vip_end_date = 1;
    obj.data.englishUser.isVip = "Y";
    body = JSON.stringify(obj);  
}
$done({body});
