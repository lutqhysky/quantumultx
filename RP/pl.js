const $tool = new Tool();
$tool.get('https://music.163.com/api/music/multi/terminal/widget/24/comment/calendar', (error, response, data) => {
    if (!error) {
        let obj = JSON.parse(data);
        let title = "𝕹𝖊𝖙𝖊𝖆𝖘𝖊 𝕮𝖆𝖑𝖊𝖓𝖉𝖆𝖗";
        let info = obj.data.songName + " - " + obj.data.singerName;
        let texts = obj.data.texts[0];
        let cover = obj.data.coverUrl;
        let options = {
     "action": "clipboard",
      "text": texts,
     "media-url": cover,
     "auto-dismiss": 10
     };
        $tool.notify(title, info, texts, options);
    } else {
        $tool.notify('出错啦');
    }
    $done();
});

function Tool() {
    this.notify = (title, info, texts, options) => {
        $notification.post(title, info, texts, options);
    };

    this.get = (url, callback) => {
        $httpClient.get(url, (error, response, data) => {
            callback(error, response, data);
        });
    };
}