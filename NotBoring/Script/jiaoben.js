Not Boring 四件套（天气、习惯、日历、时间）
^https?:\/\/api-weather\.andy\.works\/v\d\/\w{13,18}$
url = $request.url;
let obj = JSON.parse($response.body);
 obj= {
  "latestSubscriptionReceipts": [
    {
      "productId": "com.andyworks.weather.yearlyPatron",
      "autoRenewProductId": "com.andyworks.weather.yearlyPatron",
      "authToken": "",
      "purchaseDateMs": 1654888394000,
      "autoRenewStatus": "1",
      "originalTransactionId": "300001137710717",
      "sourceBundleId": "com.andyworks.weather",
      "expiresDateMs": 1855493194000,
      "isInBillingRetryPeriod": false,
      "cancellationDateMs": null,
      "isOriginalBeliever": false,
      "isTrialPeriod": true,
      "originalPurchaseDateMs": 1654888395000,
      "groupId": "20717154",
      "expirationIntent": "",
      "lastRefreshDateMs": 1854888714285
    }
  ]
};
$done({body:JSON.stringify(obj)});
