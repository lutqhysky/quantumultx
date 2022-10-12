#########################################
#^https?:\/\/api\.revenuecat\.com\/v1\/(receipts|subscribers\/(\$RCAnonymousID%3A\w{32}|\w{34}|\S{36}|\S{28}))$
#mimt: api.revenuecat.com
#########################################
var head = $request.headers;
var ua = head['User-Agent'];

if (ua.indexOf('Fileball') != -1) {
    Body = {"request_date":"1983-03-15T00:00:00Z","request_date_ms":416505600000,"subscriber":{"entitlements":{"filebox_pro":{"expires_date":null,"grace_period_expires_date":null,"product_identifier":"filebox_pro","purchase_date":"1983-03-15T00:00:00Z"}},"first_seen":"1983-03-15T00:00:00Z","last_seen":"1983-03-15T00:00:00Z","management_url":null,"non_subscriptions":{"filebox_pro":[{"id":"yingzi","is_sandbox":false,"original_purchase_date":"1983-03-15T00:00:00Z","purchase_date":"1983-03-15T00:00:00Z","store":"app_store"}]},"original_app_user_id":"$RCAnonymousID%3A8e5a11e56b4246f2ab2b17058c01db1e","original_application_version":"170","original_purchase_date":"1983-03-15T00:00:00Z","other_purchases":{"filebox_pro":{"purchase_date":"1983-03-15T00:00:00Z"}},"subscriptions":{}}};
}

if (ua.indexOf('Pillow') != -1) {
    Body = {"request_date_ms":"1581750589992","request_date":"2020-02-15T07:09:49Z","subscriber":{"non_subscriptions":{},"first_seen":"2020-02-14T20:28:01Z","original_application_version":"216","other_purchases":{},"subscriptions":{"com.neybox.pillow.premium.year":{"is_sandbox":false,"period_type":"trial","billing_issues_detected_at":null,"unsubscribe_detected_at":null,"expires_date":"2099-03-15T00:00:00Z","original_purchase_date":"2020-02-15T07:07:58Z","purchase_date":"2020-02-15T07:07:58Z","store":"app_store"}},"entitlements":{"premium":{"expires_date":"2099-03-15T00:00:00Z","product_identifier":"com.neybox.pillow.premium.year","purchase_date":"2020-02-15T07:07:58Z"}},"original_purchase_date":"2020-02-14T20:26:59Z","original_app_user_id":"D1D6D98B-EF51-48AF-9876-7352ABCEFD60","last_seen":"2020-02-14T20:28:01Z"}};
}

if (ua.indexOf('VSCO') != -1) {
    Body = {"request_date":"2022-08-22T15:45:13Z","request_date_ms":1661183113727,"subscriber":{"entitlements":{"membership":{"expires_date":"2099-03-15T00:00:00Z","grace_period_expires_date":null,"product_identifier":"vsco_global_2999_annual_7D_free","purchase_date":"2022-08-22T15:42:10Z"}},"first_seen":"2022-08-22T15:29:41Z","last_seen":"2022-08-22T15:30:16Z","management_url":"https://apps.apple.com/account/subscriptions","non_subscriptions":{},"original_app_user_id":"$RCAnonymousID:7bb196482332456a92f0883d972bc680","original_application_version":"4396","original_purchase_date":"2022-08-22T15:27:36Z","other_purchases":{},"subscriptions":{"vsco_global_2999_annual_7D_free":{"billing_issues_detected_at":null,"expires_date":"2099-03-15T00:00:00Z","grace_period_expires_date":null,"is_sandbox":false,"original_purchase_date":"2022-08-22T15:42:11Z","ownership_type":"PURCHASED","period_type":"trial","purchase_date":"2022-08-22T15:42:10Z","store":"app_store","unsubscribe_detected_at":null}}}};
}

if (ua.indexOf('Percento') != -1) {
    Body = {"request_date_ms":1663991714863,"request_date":"2022-09-24T03:55:14Z","subscriber":{"non_subscriptions":{},"first_seen":"2022-09-24T03:10:31Z","original_application_version":"8145","other_purchases":{},"management_url":"https://apps.apple.com/account/subscriptions","subscriptions":{"com.kevinreutter.Sagittarius.Premium3Months":{"is_sandbox":false,"ownership_type":"PURCHASED","billing_issues_detected_at":null,"period_type":"normal","expires_date":"9999-12-24T04:53:09Z","grace_period_expires_date":null,"unsubscribe_detected_at":"2022-09-24T03:55:14Z","original_purchase_date":"2022-09-24T03:53:13Z","purchase_date":"2022-09-24T03:53:09Z","store":"app_store"}},"entitlements":{"premium":{"grace_period_expires_date":null,"purchase_date":"2022-09-24T03:53:09Z","product_identifier":"com.kevinreutter.Sagittarius.Premium3Months","expires_date":"9999-12-24T04:53:09Z"}},"original_purchase_date":"2022-09-24T03:08:21Z","original_app_user_id":"$RCAnonymousID:1b0860a86963473592b911a17ad80ff4","last_seen":"2022-09-24T03:10:31Z"}};
}

if (ua.indexOf('widget_art') != -1) {
    Body = {"request_date_ms":1662621160568,"request_date":"2022-09-08T07:12:40Z","subscriber":{"non_subscriptions":{},"first_seen":"2022-08-02T14:29:16Z","original_application_version":"156","other_purchases":{},"management_url":null,"subscriptions":{"com.ziheng.totowallet.yearly":{"is_sandbox":false,"ownership_type":"PURCHASED","billing_issues_detected_at":null,"period_type":"trial","expires_date":"9999-09-08T01:16:31Z","grace_period_expires_date":null,"unsubscribe_detected_at":"2022-08-03T16:34:13Z","original_purchase_date":"2022-08-02T14:30:16Z","purchase_date":"2022-08-02T14:30:15Z","store":"app_store"}},"entitlements":{"all":{"grace_period_expires_date":null,"purchase_date":"2022-08-02T14:30:15Z","product_identifier":"com.ziheng.totowallet.yearly","expires_date":"9999-09-08T01:16:31Z"}},"original_purchase_date":"2022-08-02T14:27:40Z","original_app_user_id":"$RCAnonymousID:08ebc4caefdc4e84a503087d0e3544a2","last_seen":"2022-09-08T07:09:37Z"}};
}

Status = 'HTTP/1.1 200 OK';
Headers = {"Content-Type": "application/json"};

const Response = {
    status: Status,
    headers: Headers,
    body: JSON.stringify(Body)
};

$done(Response);
