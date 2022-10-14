#########################################
#^https?:\/\/api\.revenuecat\.com\/v1\/(receipts|subscribers\/(\$RCAnonymousID%3A\w{32}|\w{34}|\S{36}|\S{28}))$
#mimt: api.revenuecat.com
#########################################
var head = $request.headers;
var ua = head['User-Agent'];

if (ua.indexOf('widget_art') != -1) {
    url = $request.url;
    let obj = JSON.parse($response.body);
    obj={"request_date_ms":1662621160568,"request_date":"2022-09-08T07:12:40Z","subscriber":{"non_subscriptions":{},"first_seen":"2022-08-02T14:29:16Z","original_application_version":"156","other_purchases":{},"management_url":null,"subscriptions":{"com.ziheng.totowallet.yearly":{"is_sandbox":false,"ownership_type":"PURCHASED","billing_issues_detected_at":null,"period_type":"trial","expires_date":"9999-09-08T01:16:31Z","grace_period_expires_date":null,"unsubscribe_detected_at":"2022-08-03T16:34:13Z","original_purchase_date":"2022-08-02T14:30:16Z","purchase_date":"2022-08-02T14:30:15Z","store":"app_store"}},"entitlements":{"all":{"grace_period_expires_date":null,"purchase_date":"2022-08-02T14:30:15Z","product_identifier":"com.ziheng.totowallet.yearly","expires_date":"9999-09-08T01:16:31Z"}},"original_purchase_date":"2022-08-02T14:27:40Z","original_app_user_id":"$RCAnonymousID:08ebc4caefdc4e84a503087d0e3544a2","last_seen":"2022-09-08T07:09:37Z"}};
    $done({body:JSON.stringify(obj)});
}

if (ua.indexOf('Percento') != -1) {
    url = $request.url;
    let obj = JSON.parse($response.body);
    obj={"request_date_ms":1663991714863,"request_date":"2022-09-24T03:55:14Z","subscriber":{"non_subscriptions":{},"first_seen":"2022-09-24T03:10:31Z","original_application_version":"8145","other_purchases":{},"management_url":"https://apps.apple.com/account/subscriptions","subscriptions":{"com.kevinreutter.Sagittarius.Premium3Months":{"is_sandbox":false,"ownership_type":"PURCHASED","billing_issues_detected_at":null,"period_type":"normal","expires_date":"9999-12-24T04:53:09Z","grace_period_expires_date":null,"unsubscribe_detected_at":"2022-09-24T03:55:14Z","original_purchase_date":"2022-09-24T03:53:13Z","purchase_date":"2022-09-24T03:53:09Z","store":"app_store"}},"entitlements":{"premium":{"grace_period_expires_date":null,"purchase_date":"2022-09-24T03:53:09Z","product_identifier":"com.kevinreutter.Sagittarius.Premium3Months","expires_date":"9999-12-24T04:53:09Z"}},"original_purchase_date":"2022-09-24T03:08:21Z","original_app_user_id":"$RCAnonymousID:1b0860a86963473592b911a17ad80ff4","last_seen":"2022-09-24T03:10:31Z"}};
    $done({body:JSON.stringify(obj)});
}
