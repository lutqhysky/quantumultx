/*
app下载地址：下载Libvio，需要自己签名
^https:\/\/api\.psy-1\.com\/cosleep\/user\/info url script-response-body https://raw.githubusercontent.com/lutqhysky/quantumultx/mylove/Libvio/Script/Libvio.jsMITM =apjson.nftvio.space
MITM =api.psy-1.com
作者：清清情
*/

var body = $response.body;
var url = $request.url;
var obj = JSON.parse(body);

const vip = '/cosleep/user/info';
if (url.indexOf(vip) != -1) {
      obj.data.is_vip = 1;
      obj.data.visitor.sound.is_sound = 1;
      obj.data.visitor.sound.have_sound = 1;
      obj.data.visitor.sound.is_auto_renew = true;
      obj.data.visitor.have_vip = 1;
      obj.data.visitor.is_auto_renew = true;
      obj.data.visitor.vip_expires = 1900839229;
      obj.data.visitor.is_vip = 1;
      obj.data.vip_expires = 1900839229; 
      body = JSON.stringify(obj);    
}
$done({body});
