// 12306 开屏/广告位 mock：全部返回无广告（2026-11-20 改：0007 原返回
// 一条开屏广告，现与其他广告位一样返回无广告）。
let body = "";
let obj = JSON.parse($request.body);
const isQuanX = typeof $task !== "undefined";

if (obj.placementNo === "0007") {
  body = '{"code":"00","message":"无广告返回"}';
} else if (obj.placementNo === "G0054") {
  body = '{"code":"00","materialsList":[]}';
} else {
  body = '{"code":"00","message":"无广告返回"}';
}

if (isQuanX) {
  $done({ body });
} else {
  $done({ response: { body } });
}
