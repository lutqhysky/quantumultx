/* 
^https?:\/\/fastapi\.ukids\.cn\/coreapp\/classOqd\/course\/detail
 */ 



body = $response.body.replace(/unlock":false/g, 'unlock":true').replace(/purchased":false/g, 'subscribable":true');
$done({body});
