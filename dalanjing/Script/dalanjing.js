/* 
 app下载地址：大蓝鲸 时间 ：2022-08-21 
  MITM = *.jstv.com
 ^https?:\/\/(publish-dalanjing|publish-dalanjing|user-dalanjing)\.jstv\.com\/(search\/byArticleType|nav\/1554|PassportUser\/userinfo\/get) url response-body subscribable":false response-body subscribable":true
 作者：清清情
 下面，不用一级一级的去找了，直接像网球锤子，替换就可以了。。。！！！！，非常方便。不过这个还是不能用，需要修改的数据不止这一个。。继续努力。。
 */ 



body = $response.body.replace(/isBuy":0/g, "isBuy":1")
                      replace(/isSubscribe":0/g, "isSubscribe":1")
                      replace(/isIDNumberValid":0/g, 'isIDNumberValid":1')
                      replace(/memberEndTimestamp":0/g, "memberEndTimestamp":9876543210")
                      replace(/isMember":0/g, "isMember":1")
                      replace(/isV":0/g, "isV":1")
$done({body});
