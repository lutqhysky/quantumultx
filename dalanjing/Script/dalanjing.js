/* 
 app下载地址：大蓝鲸 时间 ：2022-08-21 
  MITM = *.jstv.com
 ^https?:\/\/(publish-dalanjing|publish-dalanjing|user-dalanjing)\.jstv\.com\/(search\/byArticleType|nav\/1554|PassportUser\/userinfo\/get) url response-body subscribable":false response-body subscribable":true
 作者：清清情
 */ 
 var body = $response.body; 
 var url = $request.url; 
 var obj = JSON.parse(body); 
  const buy = '/PassportUser/userinfo/get?'; 

  if (url.indexOf(buy) != -1) { 
     obj.data.isV = 1;  
     obj.data.memberInfo.isIDNumberValid = true; 
     obj.data.memberInfo.isMember = 1; 
     obj.data.memberInfo.memberEndTimestamp = 4100771404; 
     body = JSON.stringify(obj);  
 } 
 $done({body});
