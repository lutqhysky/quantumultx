// 中国移动 App 去广告（咪咕视频部分）
// 依据：2026-11-20 抓包确认（会话 2026-11-20-185143）
//
// 重要前提：移动 App 主接口（client.app.coc.10086.cn、clientaccess.10086.cn）
// 返回全部是加密串（分别以 ykytces3…、r8dJ+… 开头），读不到也改不了，
// 包括开屏广告、首页内容所在的 startInit / getTopAreaList / getNavigation 等。
// 因此开屏广告与首页广告无法用脚本去掉（与联通的明文 JSON 完全不同）。
// 本脚本只处理能读到的咪咕视频展示接口（display-sc.miguvideo.com，gzip 压缩的明文 JSON）：
//   1) 焦点大图轮播（领50G 等推广）：display/v3/static/<pageId>/<groupId>/<compId>
//      返回 body.data（8 条轮播，含“领50G”推广），置空数组。
//   2) 用户身份新版本（您还不是会员 / 开通会员享特权）：display/v3/static/<pageId>/<groupId>/<compId>
//      返回 body.data（含会员开通引导），置空数组。
//   3) 页面结构（display/v3/static/<pageId>）：仅定义布局，不动。
// 安全：解析失败或结构异常时一律原样返回，不破坏页面。

(function main() {
  try {
    const url = $request.url || '';
    const body = $response.body;
    if (!body) { $done({}); return; }
    const data = JSON.parse(body);
    if (!data || typeof data !== 'object') { $done({}); return; }

    // 只处理咪咕视频展示接口的数据端点（URL 含 /display/v3/static/ 且有三段 id）
    if (url.indexOf('/display/v3/static/') !== -1) {
      // body.data 是内容数组（轮播项 / 会员引导项），置空
      if (data.body && Array.isArray(data.body.data) && data.body.data.length > 0) {
        data.body.data = [];
        console.log('[移动去广告] 咪咕视频推广内容已清空：' + url);
        $done({ body: JSON.stringify(data) });
        return;
      }
      // 页面结构端点（body.groups）：不动，原样放行
      $done({});
      return;
    }

    $done({});
  } catch (e) {
    // 任何异常都原样放行，不破坏页面
    console.log('[移动去广告] 处理异常，原样返回：' + (e && e.message));
    $done({});
  }
})();
