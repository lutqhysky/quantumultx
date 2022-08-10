/*
app下载地址：下载Libvio，需要自己签名
^https?:\/\/apjson\.nftvio\.space\/xgapp\.php\/v2\/(video_detail|app_config) url script-response-body https://raw.githubusercontent.com/lutqhysky/quantumultx/mylove/Libvio/Script/Libvio.js.js
MITM =apjson.nftvio.space
作者：清清情
*/

var body = $response.body;
var url = $request.url;
var obj = JSON.parse(body);

const vip = '/xgapp.php/v2/video_detail';
if (url.indexOf(vip) != -1) {
obj.data.permission_info.download_permission = 1;
obj.data.permission_info.trysee_permission = 1;
obj.data.permission_info.download_need_permission = 2;
obj.data.permission_info.play_need_permission = 2;
obj.data.permission_info.play_permission = 1;    
    body = JSON.stringify(obj);    
}
$done({body});
