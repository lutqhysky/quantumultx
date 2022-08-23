/* 
 app下载地址：商店搜索：Readmoo 时间 ：2022-08-01 
  MITM = matrix.fingerplay.cn
 ^http:\/\/matrix\.fingerplay\.cn\/user\/fetchUserInfo url response-body subscribable":false response-body subscribable":true
 作者：清清情
 下面，不用一级一级的去找了，直接像网球锤子，替换就可以了。。。！！！！，非常方便。不过这个还是不能用，需要修改的数据不止这一个。。继续努力。。
 */ 



var body = $response.body.replace(/vip":0/g, 'vip":1')
$done({body});
