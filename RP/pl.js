coqnst $tool = new Tool();
$tool.get('https://keai.icu/apiwyy/api', (error, response, data) => {
    if (!error) {
        let obj = JSON.parse(data);
        let title = obj.user + ' 的推荐';
        let subtitle = obj.music;
        let content = obj.content;

        $tool.notify(title, subtitle, content);
    } else {
        $tool.notify('获取推荐失败', '', '请稍后重试');
    }
    $done();
});

function Tool() {
    this.notify = (title, subtitle, message) => {
        $notification.post(title, subtitle, message);
    };

    this.get = (url, callback) => {
        $httpClient.get(url, (error, response, data) => {
            callback(error, response, data);
        });
    };
}