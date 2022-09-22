url = $request.url;
let obj = JSON.parse($response.body);

    obj={
  "code" : 200,
  "flag" : true,
  "data" : {
    "profile" : {
      "ebookDiscount" : 1,
      "vipEndTime" : 1666346324000,
      "fansCount" : 0,
      "waitTakeDelivery" : 0,
      "reworkApplyQty" : 0,
      "balance" : 0,
      "waitDelivery" : 0,
      "attentionBookCount" : 0,
      "waitPaymemtQty" : 0,
      "audioDiscount" : 0.94999999999999996,
      "attentionAnchorCount" : 0,
      "integral" : 0,
      "vipEndDate" : "2022-10-21",
      "vipType" : "VIP",
      "purchaseCount" : 0,
      "couponAmount" : 0
    },
    "authorization" : "",
    "accessToken" : "eyJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE2NjM4MzcwNDgsInN1YiI6IntcImlzdXVlZEF0XCI6MTY2MzgzNzA0ODM5MixcImp3dF9hY2NvdW50XCI6XCJ7XFxcImFjY291bnRUeXBlXFxcIjpcXFwibWVtYmVyXFxcIixcXFwiaWRcXFwiOjIwNjU2LFxcXCJvdGhlcklkXFxcIjoyMDYzNyxcXFwicGFzc3dvcmRcXFwiOlxcXCJJdCdzIGEgU2VjcmV0XFxcIn1cIn0ifQ.QeiaxQ8lIi-uBW43qNU4EV0a66t-DeCmci40WuzwZHY",
    "promoterCode" : "5DI1MM",
    "isAuth" : null,
    "ucMemberId" : 20637,
    "accountType" : "member",
    "avatar" : "https://thirdwx.qlogo.cn/mmopen/vi_32/K7YDwmBJD4XSsicZ54Dxz8yqAwEdYNOZvkzVdglcpjgBEjY85nBFibl4Tkp300rlU3XpE7pFvibrFWianFHh2ibh0rw/132",
    "isNew" : false,
    "nickname" : "清清情",
    "telephone" : "86170****4224",
    "isNeedVarifyPhone" : 0
  },
  "msg" : "成功",
  "timestamp" : 1663837048377
};
$done({body:JSON.stringify(obj)});
