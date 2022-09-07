/*
>app下载地址：商店搜索：纸条
>^https?:\/\/(app1|zwzt-h5)\.zuowenzhitiao.com\/(user|content|behavior|longApi)\/(common|member|seminar|content|article)\/(getPersonInfo|info|getSeminarDetailNoContentList|list|openInfo|article|commonInfo) url script-response-body xiaozhitiao.js
>MITM = *.zuowenzhitiao.com
>作者：清清情 时间：2022年6月6日
https://app1.zuowenzhitiao.com/user/extradata
*/

var body = $response.body;
var url = $request.url;
var obj = JSON.parse(body);

const vip = '/user/common/getPersonInfo';
const vip2 = '/user/member/info';
const vip3 = '/content/seminar/getSeminarDetailNoContentList';
const vip4 = '/behavior/paragraph/list';
const vip5 = '/user/member/openInfo';
const vip6 = '/longApi/content/article/content/detail';
const vip7 = '/user/extradata';

if (url.indexOf(vip) != -1) {
    obj.data.member.type = 3;
    obj.data.member.endTime = 2705680000000;
    obj.data.member.status = 1;
    obj.data.checkStatus = true;
    body = JSON.stringify(obj);
}
if (url.indexOf(vip2) != -1) {
    obj.data.member.type = 3;
    obj.data.member.status = 1;
    obj.data.member.endTime = 2705680000000;
    body = JSON.stringify(obj);
}
if (url.indexOf(vip3) != -1) {
    obj.data.purchased = true;
    body = JSON.stringify(obj);
}
if (url.indexOf(vip4) != -1) {
    obj.data.purchased = true;
    body = JSON.stringify(obj);
}
if (url.indexOf(vip5) != -1) {
    obj.data.member.type = 3;
    obj.data.member.status = 1;
    obj.data.member.endTime = 2705680000000;
    body = JSON.stringify(obj);
}
if (url.indexOf(vip6) != -1) {
    obj.data.activityType = 1;
    body = JSON.stringify(obj);
}
if (url.indexOf(vip7) != -1) {
    obj.data.member.type = 3;
    obj.data.member.endTime = 2705680000000;
    obj.data.member.status = 1;
    obj.data.checkStatus = true;
    body = JSON.stringify(obj);
$done({body});
