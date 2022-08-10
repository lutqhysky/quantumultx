/*
app下载地址：商店搜索：配音达人
^https?:\/\/dubbing\.csweimei\.cn\/user\/GetUserInfo url script-response-body https://raw.githubusercontent.com/lutqhysky/quantumultx/mylove/peiyindaren/Script/peiyindaren.js
MITM = dubbing.csweimei.cn
作者：清清情
*/

var body = $response.body;
var url = $request.url;
var obj = JSON.parse(body);

const vip = '/user/GetUserInfo';
if (url.indexOf(vip) != -1)[ {
    obj.data.vipday = 9999;
    obj.data.boughtCourse = 1;
    obj.data.status = 1;
    obj.data.nickname = "清清情";
    obj.data.user_type_id = 3;
    obj.data.isApply = 1;
    obj.data.ischeckreal = 1;
    body = JSON.stringify(obj);
}]
$done({body});
