/* 
^https?:\/\/fastapi\.ukids\.cn\/coreapp\/classOqd\/course\/detail
 */ 



var body = $response.body.replace(/purchased":false/g, 'subscribable":true')
                         .replace(/purchased":false/g, 'subscribable":true')
$done({body});
