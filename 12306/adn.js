// 12306 请求拦截：按 operation-type 头拦掉首页推广类接口（正文加密，
// 只能按接口名拦）。覆盖：活动横幅（铁路e卡通）、热门资讯、商品信息流
// （铁路商城/铁路精选）、商业推广、铁路会员常见问题。公告与温馨服务
// 随 initData 一并拦掉；若仍有残留，再按新抓包的 operation-type 补。
// 注意：Surge 的 http-request 脚本里 $done() 是放行不是拦截（QuanX
// 写法在 Surge 下失效），拦截必须返回一个 mock 响应，这里返回 404。
const url = $request.url;
const header = $request.headers;
const contype = header["content-type"];
const headopt = header["operation-type"];

if (url.includes("/mobile.12306.cn/otsmobile/app/mgs/")) {
  // 12306页面内容
  const list12306 = [
    // "com.cars.otsmobile.bangbangSafe.deciveInfo", // 设备序列号
    // "com.cars.otsmobile.checkLoginStatus", // 登录信息
    // "com.cars.otsmobile.city",
    // "com.cars.otsmobile.initCountry",
    // "com.cars.otsmobile.initNewSysCache",
    // "com.cars.otsmobile.initProvince",
    "com.cars.otsmobile.integration.activityBanner", // 活动横幅
    "com.cars.otsmobile.memberInfo.getMemberQa", // 铁路会员 常见问题
    // "com.cars.otsmobile.memberInfo.integrationHomeInit", // 铁路会员 会员信息
    // "com.cars.otsmobile.newHomePage.getWeatherByStationCode", // 天气信息
    "com.cars.otsmobile.newHomePage.initData", // 热门资讯
    "com.cars.otsmobile.newHomePageBussData", // 商品信息流
    // "com.cars.otsmobile.newHomePageRefresh",
    "com.cars.otsmobile.paySuccBuss.bussEntryShow" // 商业推广
    // "com.cars.otsmobile.travelPage.initData", // 出行服务
  ];
  if (list12306?.includes(headopt)) {
    $done({ response: { status: 404, body: "" } });
  } else {
    $done({});
  }
} else if (url.includes("/mobilepaas.abchina.com.cn:441/mgw")) {
  // 中国农业银行开屏广告
  const listbankabc = [
    "com.bankabc.recommendcenter.homepage.gethpadverinfo",
    "com.abchina.mbank.common.homepage.getStartParam"
  ];
  if (listbankabc?.includes(headopt)) {
    $done({ response: { status: 404, body: "" } });
  } else {
    $done({});
  }
} else if (url.includes("/sec.sginput.qq.com/q")) {
  // 搜狗输入法候选词推广
  if (contype === "application/octet-stream") {
    $done({ response: { status: 404, body: "" } });
  } else {
    $done({});
  }
} else {
  $done({});
}
