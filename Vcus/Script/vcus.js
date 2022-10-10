url = $request.url;
let obj = JSON.parse($response.body);
 obj= {
  "code" : 0,
  "data" : {
    "inApp" : [

    ],
    "latestReceiptInfo" : [
      {
        "productId" : "vcus.subs.month12.func00.lev00.ver1",
        "quantity" : 1,
        "promotionalOfferId" : "",
        "purchaseDateMs" : "1665344803000",
        "autoRenewStatus" : false,
        "productType" : "",
        "originalTransactionId" : "730000978197460",
        "expiresDateMs" : "4092647115000",
        "transactionId" : "730000978197460",
        "offerCodeRefName" : "",
        "isTrialPeriod" : false,
        "gracePeriodExpiresDateMs" : "",
        "isInIntroOfferPeriod" : false,
        "originalPurchaseDateMs" : "1665344805000",
        "inAppOwnershipType" : "PURCHASED",
        "status" : 1
      }
    ]
  },
  "message" : "success",
  "update" : ""
};
$done({body:JSON.stringify(obj)});
