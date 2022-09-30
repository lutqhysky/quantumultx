[rewrite_local]
# ～ 咿啦看書解鎖英语部分（2022-09-29）@清清情
^https?:\/\/englishapi\.ellabook\.cn\/en\/picBook\/getPicBookInfo\/v\d+ url script-response-body https://raw.githubusercontent.com/lutqhysky/quantumultx/mylove/yilakanshu/Script/ylksbuy.js
[mitm] 
hostname= englishapi.ellabook.cn
***********************************/
var body = $response.body.replace(/bought":"false/g, "bought\":\"true").replace(/isBuy":"false/g, "isBuy\":\"true");
$done({body})
