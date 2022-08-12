/* 
 app下载地址：商店搜索：Readmoo 时间 ：2022-08-01 
  MITM = api.readmoo.com
 ^https?:\/\/api.readmoo.com/store/v3/books/210000175000101/reviews url response-body subscribable":false response-body subscribable":true
 作者：清清情 
 */ 



var body = $response.body.replace(/subscribable":false/g, 'subscribable":true')
$done({body});
