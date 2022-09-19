var body = $response.body.replace(/vipEndTime":\d+/g, 'vipEndTime":9876543210').replace(/vipEndDate":.*?/g, 'vipEndDate":2099-12-12').replace(/vipType":"\w+"/g, 'vipType":"ylttxsvipyear"').replace(/purchaseCount":\d+/g, 'purchaseCount":9876543210').replace(/accountType":"\w+"/g, 'accountType":"ylttxsvipyear"');
$done({body});
