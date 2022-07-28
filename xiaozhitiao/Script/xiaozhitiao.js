/*
>app下载地址：商店搜索：纸条
>^https?:https:\/\/app1\.zuowenzhitiao\.com\/user\/common\/getPersonInfo url script-response-body xiaozhitiao.js
>MITM = *.zuowenzhitiao.com
>作者：清清情 时间：2022年6月6日
*/

var body = $response.body;
var url = $request.url;
var obj = JSON.parse(body);

const vip = '/user/common/getPersonInfo';
if (url.indexOf(vip) != -1) {
    obj.member.type = 2;
    obj.result.status = 1;
    obj.data.checkStatus = true;
    body = JSON.stringify(obj);
}
$done({body});
