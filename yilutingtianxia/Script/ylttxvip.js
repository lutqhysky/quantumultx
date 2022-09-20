url = $request.url;
let obj = JSON.parse($response.body);

    obj={
  "code" : 200,
  "flag" : true,
  "data" : {
    "ebookDiscount" : 1,
    "vipEndTime" : 1697731200000,
    "fansCount" : 0,
    "waitTakeDelivery" : 0,
    "reworkApplyQty" : 0,
    "balance" : 0,
    "waitDelivery" : 0,
    "attentionBookCount" : 0,
    "waitPaymemtQty" : 0,
    "audioDiscount" : 0.94999999999999996,
    "attentionAnchorCount" : 1,
    "integral" : 0,
    "vipEndDate" : "2023-10-20",
    "vipType" : "VIP",
    "purchaseCount" : 0,
    "couponAmount" : 0
  },
  "msg" : "成功",
  "timestamp" : 1663639512301
};
$done({body:JSON.stringify(obj)});
