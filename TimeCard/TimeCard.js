// ==================== 节日列表 ====================
var tlist = {
    1:  ["元旦",       "2026-01-01"],
    2:  ["小寒",       "2026-01-05"],
    3:  ["腊八节",     "2026-01-26"],
    4:  ["小年(北)",   "2026-02-10"],
    5:  ["小年(南)",   "2026-02-11"],
    6:  ["情人节",     "2026-02-14"],
    7:  ["除夕",       "2026-02-16"],
    8:  ["春节",       "2026-02-17"],
    9:  ["立春",       "2026-02-03"],
    10: ["元宵节",     "2026-02-22"],
    11: ["雨水",       "2026-02-18"],
    12: ["惊蛰",       "2026-03-05"],
    13: ["妇女节",     "2026-03-08"],
    14: ["春分",       "2026-03-20"],
    15: ["愚人节",     "2026-04-01"],
    16: ["清明节",     "2026-04-04"],
    17: ["谷雨",       "2026-04-20"],
    18: ["劳动节",     "2026-05-01"],
    19: ["立夏",       "2026-05-05"],
    20: ["母亲节",     "2026-05-10"],
    21: ["小满",       "2026-05-21"],
    22: ["端午节",     "2026-06-19"],
    23: ["儿童节",     "2026-06-01"],
    24: ["芒种",       "2026-06-05"],
    25: ["父亲节",     "2026-06-21"],
    26: ["夏至",       "2026-06-21"],
    27: ["小暑",       "2026-07-07"],
    28: ["大暑",       "2026-07-22"],
    29: ["立秋",       "2026-08-07"],
    30: ["处暑",       "2026-08-23"],
    31: ["七夕节",     "2026-08-17"],
    32: ["中元节",     "2026-09-25"],
    33: ["白露",       "2026-09-07"],
    34: ["教师节",     "2026-09-10"],
    35: ["秋分",       "2026-09-23"],
    36: ["国庆节",     "2026-10-01"],
    37: ["中秋节",     "2026-10-05"],
    38: ["寒露",       "2026-10-08"],
    39: ["霜降",       "2026-10-23"],
    40: ["重阳节",     "2026-10-17"],
    41: ["寒衣节",     "2026-11-01"],
    42: ["立冬",       "2026-11-07"],
    43: ["小雪",       "2026-11-22"],
    44: ["下元节",     "2026-12-04"],
    45: ["大雪",       "2026-12-07"],
    46: ["冬至",       "2026-12-21"],
    47: ["元旦",       "2027-01-01"] // 跨年延伸
};

// ==================== 获取今天日期 ====================
let tnow = new Date();
let tnowf = tnow.getFullYear() + "-" +
            String(tnow.getMonth() + 1).padStart(2, '0') + "-" +
            String(tnow.getDate()).padStart(2, '0');

// ==================== 日期差函数 ====================
function dateDiff(startDateString, endDateString) {
    let [y1,m1,d1] = startDateString.split("-").map(Number);
    let [y2,m2,d2] = endDateString.split("-").map(Number);
    let startDate = new Date(y1, m1-1, d1);
    let endDate = new Date(y2, m2-1, d2);
    return Math.floor((endDate - startDate)/1000/60/60/24);
}

// ==================== 获取序号对应天数差 ====================
function tnumcount(num) {
    return dateDiff(tnowf, tlist[num][1]);
}

// ==================== 获取最近节日序号 ====================
function now() {
    for (let i=1; i<=Object.keys(tlist).length; i++) {
        if (tnumcount(i) >= 0) return i;
    }
    return Object.keys(tlist).length;
}

let nowlist = now();

// ==================== 锁屏通知 ====================
function datenotice() {
    if ($persistentStore.read("timecardpushed") != tlist[nowlist][1] && tnow.getHours() >= 6) {
        $persistentStore.write(tlist[nowlist][1], "timecardpushed");
        $notification.post(
            "节日提醒",
            "",
            "今天是" + tlist[nowlist][1] + "【" + tlist[nowlist][0] + "】，一个值得纪念的日子！"
        );
    }
}

// ==================== 图标和颜色 ====================
function icon_now(num) {
    if (num <= 7 && num > 3) return "hare.fill";
    if (num <= 3 && num > 0) return "hourglass";
    if (num == 0) return "gift.fill";
    return "tortoise.fill";
}

function icon_color(num) {
    if (num <= 7 && num > 3) return '#ff9800';
    if (num <= 3 && num > 0) return '#9978FF';
    if (num == 0) return '#FF0000';
    return '#35C759';
}

// ==================== 随机标题 ====================
function title_random(num) {
    const dic = {
        1: "距离放假，还要摸鱼多少天？🥱",
        2: "坚持住，就快放假啦！💪",
        3: "上班好累呀，好想放假😮‍💨",
        4: "努力，我还能加班24小时！🧐",
        5: "天呐，还要多久才放假呀？😭",
        6: "躺平中，等放假(☝ ՞ਊ ՞)☝",
        7: "只有摸鱼才是赚老板的钱🙎🤳",
        8: "一起摸鱼吧✌(՞ټ՞ )✌",
        9: "摸鱼中，期待下一个假日.ʕʘ‿ʘʔ.",
        10:"小乌龟慢慢爬🐢",
        11:"太难了！😫😩😖(´◉‿◉)",
        12:"反正放假也不能去玩😤"
    };
    if (num == 0) return "今天是" + tlist[nowlist][0] + "，休息一下吧 ~";
    return dic[Math.floor(Math.random()*12)+1];
}

// ==================== 获取最近三个节日倒计时 ====================
function getNextThree() {
    let content = [];
    for (let i=0; i<3; i++) {
        let idx = nowlist + i;
        if (idx > Object.keys(tlist).length) break;
        let diff = tnumcount(idx);
        content.push(tlist[idx][0] + (diff == 0 ? "" : diff+"天"));
    }
    return content.join(" | ");
}

// ==================== 推送逻辑 ====================
if (tnumcount(nowlist) == 0) datenotice();

$done({
    title: title_random(tnumcount(nowlist)),
    icon: icon_now(tnumcount(nowlist)),
    "icon-color": icon_color(tnumcount(nowlist)),
    content: getNextThree()
});
