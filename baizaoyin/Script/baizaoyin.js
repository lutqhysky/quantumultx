/* 
 app下载地址：白噪音
  MITM = matrix.fingerplay.cn
 ^http:\/\/matrix\.fingerplay\.cn\/user\/fetchUserInfo url response-body https://raw.githubusercontent.com/lutqhysky/quantumultx/mylove/baizaoyin/Script/baizaoyin.js
 作者：清清情
 下面，不用一级一级的去找了，直接像网球锤子，替换就可以了。。。！！！！
 */ 



var body = $response.body.replace(/vip":0/g, 'vip":1')
$done({body});
