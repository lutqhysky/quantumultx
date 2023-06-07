/* 
 app下载地址：Vister看天下
  MITM = open3.vistastory.com
 ^https?:\/\/open3\.vistastory\.com\/v3\/api\/(vip\/get_vip_info_and_recommend_mags|article\/article_detail2|my\/home\/get_home_center|vip\/get_vip_price_info) url response-body https://raw.githubusercontent.com/lutqhysky/quantumultx/mylove/Vister/Script/Vister.js
 作者：清清情
 下面，不用一级一级的去找了，直接像网球锤子，替换就可以了。。。！！！！
 */ 
body = $response.body.replace(/expireVip":1/g, 'iexpireVip":0').replace(/isFree":0/g, 'isFree":1').replace(/isMiniVip":0/g, 'isMiniVip":1').replace(/isActive":0/g, 'isActive":1').replace(/isVip":0/g, 'isVip":1').replace(/endTime":\d{13}/g, 'endTime":4100726622000').replace(/isBuyMag":0/g, 'isBuyMag":1').replace(/isBuyArticle":0/g, 'isBuyArticle":1');
$done({body});

