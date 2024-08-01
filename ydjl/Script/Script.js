//转载的
var aFengYe = $response.body;
var obj =  JSON.parse(aFengYe);

var vipInfo = {
  "member_type": 4,
  "member_status": 1
}

for (let key in obj.data) {
  if (vipInfo.hasOwnProperty(key)) {
     obj.data[key] = vipInfo[key]
  }
}


aFengYe = JSON.stringify(obj);
$done(aFengYe);
