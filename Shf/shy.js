const $tool = new Tool();

// 修改后的 URL，用于获取新的 JSON 数据
const url = 'https://apis.tianapi.com/godreply/index?key=1a59b6eb388ca609941adc8681a63a2f'; // 用实际的 API 地址替换 '你的API地址'

$tool.get(url, (error, response, data) => {
    if (!error) {
        let obj = JSON.parse(data);
        if (obj.code === 200 && obj.result && obj.result.list && obj.result.list.length > 0) {
            let title = "神回复";
            let info = obj.result.list[0].title; // 标题作为附加信息
            let texts = obj.result.list[0].content; // 内容作为文本
            let options = {
                "action": "clipboard",
                "text": info+texts,
                "auto-dismiss": 10
            };
            // 由于 JSON 结构不同，没有图片信息，所以不传递 media-url 参数
            $tool.notify(title, info, texts, options);
        } else {
            $tool.notify("错误", "没有找到数据", "请稍后再试");
        }
    } else {
        $tool.notify("错误", "网络请求失败", error);
    }
    $done();
});

function Tool() {
    this.notify = (title, info, texts, options) => {
        // 根据 Surge 的 $notification.post 可用参数调整
        $notification.post(title, info, texts, options);
    };

    this.get = (url, callback) => {
        $httpClient.get(url, (error, response, data) => {
            callback(error, response, data);
        });
    };
}
const $tool = new Tool();

// 修改后的 URL，用于获取新的 JSON 数据
const url = 'https://apis.tianapi.com/godreply/index?key=1a59b6eb388ca609941adc8681a63a2f'; // 用实际的 API 地址替换 '你的API地址'

$tool.get(url, (error, response, data) => {
    if (!error) {
        let obj = JSON.parse(data);
        if (obj.code === 200 && obj.result && obj.result.list && obj.result.list.length > 0) {
            let title = "神回复";
            let info = obj.result.list[0].title; // 标题作为附加信息
            let texts = obj.result.list[0].content; // 内容作为文本
            let options = {
                "action": "clipboard",
                "text": info+texts,
                "auto-dismiss": 10
            };
            // 由于 JSON 结构不同，没有图片信息，所以不传递 media-url 参数
            $tool.notify(title, info, texts, options);
        } else {
            $tool.notify("错误", "没有找到数据", "请稍后再试");
        }
    } else {
        $tool.notify("错误", "网络请求失败", error);
    }
    $done();
});

function Tool() {
    this.notify = (title, info, texts, options) => {
        // 根据 Surge 的 $notification.post 可用参数调整
        $notification.post(title, info, texts, options);
    };

    this.get = (url, callback) => {
        $httpClient.get(url, (error, response, data) => {
            callback(error, response, data);
        });
    };
}

    this.get = (url, callback) => {
        $httpClient.get(url, (error, response, data) => {
            callback(error, response, data);
        });
    };
}
