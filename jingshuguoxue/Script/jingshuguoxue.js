/* 
 app下载地址：Vister看天下
  MITM = 47.104.228.152
 ^https?:\/\/47\.104\.228\.152:9001\/api\/apiAppUser\/getUser url response-body https://raw.githubusercontent.com/lutqhysky/quantumultx/mylove/Vister/Script/Vister.js
 作者：清清情
 下面，不用一级一级的去找了，直接像网球锤子，替换就可以了。。。！！！！
 */ 
body = $response.body.replace(/cardType":"-\d"/g, 'cardType":"1"').replace(/days":"\d+"/g, 'days":"6666"').replace(/isExpire":"1"/g, 'isExpire":"0"').replace(/expireTime":"."*?"/g, 'expireTime":"2099-05-10"');
$done({body});
