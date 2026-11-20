// 欧姆龙 App 去推广（热门活动）
// 依据：2026-11-20 抓包确认（会话 2026-11-20-191017）
//
// 热门活动：/oplus/v1/cmm/ad/banner 返回 3 条轮播横幅
//   （aio banner、CGM banner、欧姆龙会员商城，均跳有赞商城），
//   data 置空数组后轮播无内容可画。
//   响应为 gzip 压缩，Surge 脚本收到的是已解压的正文，直接按 JSON 处理。
//
// 每日任务：抓包里没有任何接口返回任务列表
//   （Account/DailyTaskStatus 返回 data:null，Sign/Continue 与
//   Habits/List 均返回空数组），签到/上传测量数据/记录生活习惯
//   三项为 App 内置写死，脚本够不着，不处理。
// 安全：解析失败或结构异常时一律原样返回，不破坏页面。

(function main() {
  try {
    const url = $request.url || '';
    const body = $response.body;
    if (!body) { $done({}); return; }
    const data = JSON.parse(body);
    if (!data || typeof data !== 'object') { $done({}); return; }

    // 热门活动轮播：data 置空
    if (url.indexOf('/oplus/v1/cmm/ad/banner') !== -1) {
      if (Array.isArray(data.data) && data.data.length > 0) {
        data.data = [];
        console.log('[欧姆龙] 热门活动横幅已清空');
        $done({ body: JSON.stringify(data) });
        return;
      }
      $done({});
      return;
    }

    $done({});
  } catch (e) {
    // 任何异常都原样放行，不破坏页面
    console.log('[欧姆龙] 处理异常，原样返回：' + (e && e.message));
    $done({});
  }
})();
