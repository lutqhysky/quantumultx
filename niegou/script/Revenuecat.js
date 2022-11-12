var head = $request["headers"];
var ua = head["User-Agent"];
var obj = JSON.parse($response.body);

if (ua.indexOf["Fileball"] != -1) {
    obj = {"request_date":"1983-03-15T00:00:00Z","request_date_ms":416505600000,"subscriber":{"entitlements":{"filebox_pro":{"expires_date":null,"grace_period_expires_date":null,"product_identifier":"filebox_pro","purchase_date":"1983-03-15T00:00:00Z"}},"first_seen":"1983-03-15T00:00:00Z","last_seen":"1983-03-15T00:00:00Z","management_url":null,"non_subscriptions":{"filebox_pro":[{"id":"yingzi","is_sandbox":false,"original_purchase_date":"1983-03-15T00:00:00Z","purchase_date":"1983-03-15T00:00:00Z","store":"app_store"}]},"original_app_user_id":"$RCAnonymousID%3A8e5a11e56b4246f2ab2b17058c01db1e","original_application_version":"170","original_purchase_date":"1983-03-15T00:00:00Z","other_purchases":{"filebox_pro":{"purchase_date":"1983-03-15T00:00:00Z"}},"subscriptions":{}}}
}
if (ua.indexOf["1Blocker"] != -1) {
    obj = {"request_date_ms":1656142614383,"request_date":"2022-06-25T07:36:54Z","subscriber":{"non_subscriptions":{},"first_seen":"2020-11-14T01:01:01Z","original_application_version":"900","other_purchases":{},"management_url":"itms-apps://apps.apple.com/account/subscriptions","subscriptions":{"blocker.ios.iap.lifetime":{"is_sandbox":false,"period_type":"trial","billing_issues_detected_at":null,"unsubscribe_detected_at":null,"expires_date":null,"grace_period_expires_date":null,"original_purchase_date":"2020-11-14T12:45:21Z","purchase_date":"2020-11-14T12:45:20Z","store":"app_store"}},"entitlements":{"premium":{"grace_period_expires_date":null,"purchase_date":"2020-11-14T01:01:01Z","product_identifier":"blocker.ios.iap.lifetime","expires_date":null}},"original_purchase_date":"2020-11-14T12:43:04Z","original_app_user_id":"9C57FE95-67YU-999B-09CB-GH89HJK89","last_seen":"2020-11-14T01:01:01Z"}}
}
if (ua.indexOf["Vision"] != -1) {
    obj = {{"request_date_ms":1662599120248,"request_date":"2022-09-08T01:05:20Z","subscriber":{"last_seen":"2022-09-08T01:04:03Z","first_seen":"2022-09-08T01:04:03Z","original_application_version":"8","other_purchases":{},"management_url":"https://apps.apple.com/account/subscriptions","subscriptions":{"com.ddgksf2013.premium.yearly":{"is_sandbox":false,"ownership_type":"PURCHASED","billing_issues_detected_at":null,"period_type":"normal","expires_date":"2023-12-18T01:04:17Z","grace_period_expires_date":null,"unsubscribe_detected_at":null,"original_purchase_date":"2022-09-08T01:04:18Z","purchase_date":"2022-09-08T01:04:17Z","store":"app_store"}},"entitlements":{"pro":{"expires_date":"2023-12-18T01:04:17Z","purchase_date":"2022-09-08T01:04:17Z","product_identifier":"com.ddgksf2013.premium.yearly","grace_period_expires_date":null}},"original_purchase_date":"2022-09-07T13:05:43Z","original_app_user_id":"$RCAnonymousID:ddgksf2013","non_subscriptions":{}}}}
}
$done({body:JSON.stringify(obj)});

