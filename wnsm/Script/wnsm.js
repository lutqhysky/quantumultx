re('"expires":\\d+@"expired":\\w+@"vip":\\w+@"vipNeedPay":\\w+@"needPay":\\w+@"bought":\\w+@"buy":\\w+','"expires":4079147492000@"expired":false@"vip":true@"vipNeedPay":false@"needPay":false@"bought":true@"buy":true')
function re() {
var body = $response.body;
if(!body){
$done({});
}
 if (arguments[0].includes("@")) {
  var regs = arguments[0].split("@");
  var strs = arguments[1].split("@");
  for (i = 0;i < regs.length;i++) {
  var reg = new RegExp(regs[i],"g");
  body = body.replace(reg, strs[i]);
 }
}
 else {
  var reg = new RegExp(arguments[0],"g");
  body = body.replace(reg, arguments[1]);
}
 $done({body});
} 
