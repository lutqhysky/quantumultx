/*************************************
服务新干线解锁

更新记录：
- 2026-11-21 22:20 新增 users/my/infos 会员状态：视频能看（courses 已置 bought/vip），
  但「我的」页仍显示非会员——该接口原返回只有基础信息、无任何会员字段，
  故补 vip/isVip/vipType 等字段。抓包实证：users/my/infos 仅 111 字节
  （yunid/nickname/username/mobile/email），assets、vipskus 亦无用户会员状态字段。
- 2026-11-21 之前  courses 接口置 bought=true、vip=true（视频显示已购买、可观看）

注意：users/my/infos 的会员字段名为推断（courses 用 vip、vipskus 用 vipType），
若「我的」页仍显示非会员，需再抓开通会员页的包确认字段名。
*************************************/

var body = $response.body;
var url = $request.url;
var obj;
try {
    obj = JSON.parse(body);
} catch (e) {
    // 解析失败原样放行
    $done({});
    return;
}

// 课程/视频详情：已购买 + 会员（原有逻辑保留）
if (url.indexOf('/aggregation/v1/courses') !== -1) {
    obj.bought = true;
    obj.vip = true;
}

// 「我的」页用户信息：补会员字段（原返回无任何会员字段，App 默认显示非会员）
if (url.indexOf('/aggregation/v1/users/my/infos') !== -1) {
    obj.vip = true;
    obj.isVip = true;
    obj.vipType = 2; // 2=年付（vipskus：0=月付，1=季付，2=年付）
    obj.member = true;
    obj.isMember = true;
    obj.vipExpireTime = '2099-12-31 23:59:59';
    obj.vipEndTime = '2099-12-31 23:59:59';
    obj.memberExpireTime = '2099-12-31 23:59:59';
}

$done({ body: JSON.stringify(obj) });
