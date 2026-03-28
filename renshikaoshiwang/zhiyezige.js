const $ = new Env("人事考试网关键公告");

// 日志等级
$.logLevel = ($.getdata("cpta_debug") === "true") ? "debug" : "info";

// 免责声明
showDisclaimer();
$.info("日志等级: " + $.logLevel.toUpperCase());

// ========== 配置 ==========
const Config = {
  url: $.getdata("cpta_url") || "http://www.cpta.com.cn/notice.html",
  keywordsRaw: $.getdata("cpta_keywords") || "监理|造价|建造师",
  maxCount: toNumber($.getdata("cpta_max_count"), 10),
  onlyNew: toBool($.getdata("cpta_only_new"), true),
  showLink: toBool($.getdata("cpta_show_link"), false),
  enableNotification: toBool($.getdata("cpta_enable_notification"), true),
  firstRunNotify: toBool($.getdata("cpta_first_run_notify"), false),
  recentDaysRed: toNumber($.getdata("cpta_recent_days_red"), 7),
  recentDaysOrange: toNumber($.getdata("cpta_recent_days_orange"), 30),
  maxAgeDays: toNumber($.getdata("cpta_max_age_days"), 90),
  saveLimit: toNumber($.getdata("cpta_save_limit"), 100),
  clearCache: toBool($.getdata("cpta_clear_cache"), false),

  barkPush: $.getdata("cpta_bark_push") || "",
  barkAutoCopy: toBool($.getdata("cpta_bark_auto_copy"), false),
  barkSound: $.getdata("cpta_bark_sound") || "",
  barkGroup: $.getdata("cpta_bark_group") || "人事考试网公告",

  tgEnable: toBool($.getdata("cpta_tg_enable"), false),
  tgBotToken: $.getdata("cpta_tg_bot_token") || "",
  tgChatId: $.getdata("cpta_tg_chat_id") || "",
  tgDisableWebPagePreview: toBool($.getdata("cpta_tg_disable_web_page_preview"), true)
};

Config.keywords = Config.keywordsRaw.split("|").map(s => s.trim()).filter(Boolean);
if (Config.recentDaysOrange < Config.recentDaysRed) Config.recentDaysOrange = 30;

$.debug("当前配置: " + $.toStr({
  url: Config.url,
  keywords: Config.keywords,
  maxCount: Config.maxCount,
  onlyNew: Config.onlyNew,
  showLink: Config.showLink,
  enableNotification: Config.enableNotification,
  firstRunNotify: Config.firstRunNotify,
  maxAgeDays: Config.maxAgeDays
}));

if (Config.barkPush) {
  $.debug("已开启Bark推送");
} else {
  $.debug("未开启Bark推送");
}

if (Config.tgEnable) {
  $.debug("已开启Telegram推送");
} else {
  $.debug("未开启Telegram推送");
}

// ========== 缓存键 ==========
const CacheKeys = {
  latestIds: "cpta_latest_ids",
  inited: "cpta_inited"
};

(async () => {
  if (Config.clearCache) {
    $.setdata("[]", CacheKeys.latestIds);
    $.setdata("false", CacheKeys.inited);
    $.setdata("false", "cpta_clear_cache");
    $.info("已清空缓存，本次按首次运行处理");
  }

  const html = await httpGet(Config.url);
  $.debug("页面抓取完成，长度: " + (html ? html.length : 0));
  if (!html) throw new Error("页面内容为空，可能网站暂时不可用");

  let notices = extractNotices(html);
  $.debug("页面原始解析条数: " + notices.length);
  if (!notices.length) throw new Error("页面解析失败，可能网站结构已变更");

  notices = notices.filter(item => Config.keywords.some(k => item.title.indexOf(k) !== -1));
  $.debug("关键词过滤后条数: " + notices.length);

  const seen = new Set();
  notices = notices.filter(item => {
    const id = makeId(item);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  notices = notices.filter(item => {
    const d = parseDate(item.date);
    return d && diffDays(d) <= Config.maxAgeDays;
  });
  $.debug("日期过滤后条数: " + notices.length);

  notices.sort((a, b) => {
    const ta = parseDate(a.date) ? parseDate(a.date).getTime() : 0;
    const tb = parseDate(b.date) ? parseDate(b.date).getTime() : 0;
    return tb - ta;
  });

  if (!notices.length) {
    throw new Error("没有找到最近 " + Config.maxAgeDays + " 天内包含关键词（" + Config.keywords.join(" / ") + "）的公告");
  }

  const panelList = notices.slice(0, Config.maxCount);

  const oldIds = $.toObj($.getdata(CacheKeys.latestIds) || "[]", []);
  const oldSet = new Set(Array.isArray(oldIds) ? oldIds : []);
  const newItems = notices.filter(item => !oldSet.has(makeId(item)));

  const hasInited = $.getdata(CacheKeys.inited) === "true";
  const isFirstRun = !hasInited;

  $.debug("本次新增条数: " + newItems.length);
  $.debug("是否首次运行: " + isFirstRun);

  const latestIds = notices.slice(0, Config.saveLimit).map(item => makeId(item));
  $.setdata($.toStr(latestIds), CacheKeys.latestIds);
  $.setdata("true", CacheKeys.inited);

  const recentRed = panelList.filter(item => diffDays(parseDate(item.date)) <= Config.recentDaysRed).length;
  const recentOrange = panelList.filter(item => diffDays(parseDate(item.date)) <= Config.recentDaysOrange).length;

  let panelTitle = $.name;
  if (recentRed > 0) {
    panelTitle = $.name + " — 🔴" + recentRed + "条近期公告";
  } else if (recentOrange > 0) {
    panelTitle = $.name + " — 🟠" + recentOrange + "条近30天公告";
  }

  const panelContent = panelList.map((item, idx) => {
    const arr = [
      (idx + 1) + ". " + getTimeMarker(item.date) + " " + getKeywordTag(item.title) + " " + item.title,
      "📅 " + item.date
    ];
    if (Config.showLink) arr.push("🔗 " + item.link);
    return arr.join("\n");
  }).join("\n\n");

  let shouldNotify = false;
  let notifyTitle = "";
  let notifySub = "";
  let notifyBody = "";
  let pushItems = [];

  if (Config.onlyNew) {
    if (isFirstRun) {
      if (Config.firstRunNotify && panelList.length > 0) {
        shouldNotify = Config.enableNotification;
        notifyTitle = $.name + "（首次运行）";
        notifySub = "已建立缓存，当前匹配 " + panelList.length + " 条";
        pushItems = panelList;
      }
    } else if (newItems.length > 0) {
      shouldNotify = Config.enableNotification;
      notifyTitle = $.name + " — 发现 " + newItems.length + " 条新公告";
      notifySub = "关键词：" + Config.keywords.join(" / ");
      pushItems = newItems.slice(0, Config.maxCount);
    }
  } else {
    shouldNotify = Config.enableNotification;
    notifyTitle = panelTitle;
    notifySub = "关键词：" + Config.keywords.join(" / ") + "｜共 " + panelList.length + " 条";
    pushItems = panelList;
  }

  $.debug("是否发送通知: " + shouldNotify);
  $.debug("推送条数: " + pushItems.length);

  if (pushItems.length) {
    notifyBody = pushItems.map((item, idx) => {
      return (idx + 1) + ". " + getTimeMarker(item.date) + " " + getKeywordTag(item.title) + " " + item.title + " (" + item.date + ")";
    }).join("\n");
  }

  if (shouldNotify) {
    $.msg(notifyTitle, notifySub, notifyBody);

    const barkBody = pushItems.map((item, idx) => {
      let text = (idx + 1) + ". " + getTimeMarker(item.date) + " " + getKeywordTag(item.title) + " " + item.title + "\n📅 " + item.date;
      if (Config.showLink) text += "\n🔗 " + item.link;
      return text;
    }).join("\n\n");

    const firstLink = pushItems[0] ? pushItems[0].link : "";

    if (Config.barkPush) {
      await barkNotify(notifyTitle, notifySub, barkBody, firstLink);
    }

    if (Config.tgEnable && Config.tgBotToken && Config.tgChatId) {
      const tgText = [notifyTitle, notifySub].filter(Boolean).join("\n") + "\n\n" + pushItems.map((item, idx) => {
        let text = (idx + 1) + ". " + getTimeMarker(item.date) + " " + getKeywordTag(item.title) + " " + item.title + "\n📅 " + item.date;
        if (item.link) text += "\n🔗 " + item.link;
        return text;
      }).join("\n\n");
      await telegramNotify(tgText);
    }
  }

  const statusLine = isFirstRun ? "初始化：首次运行，已建立缓存" : "本次新增：" + newItems.length + " 条";
  const summaryLine = "关键词：" + Config.keywords.join(" / ") + "｜展示：" + panelList.length + " 条｜模式：" + (Config.onlyNew ? "仅新增通知" : "每次通知") + "｜范围：最近 " + Config.maxAgeDays + " 天";

  let iconColor = "#b8b8b8";
  if (isFirstRun) {
    iconColor = recentRed > 0 ? "#FF5A5A" : (recentOrange > 0 ? "#FF9F0A" : "#b8b8b8");
  } else {
    iconColor = newItems.length > 0 ? "#FF5A5A" : (recentOrange > 0 ? "#FF9F0A" : "#b8b8b8");
  }

  $.done({
    title: panelTitle,
    content: summaryLine + "\n" + statusLine + "\n\n" + panelContent,
    icon: "appletv",
    "icon-color": iconColor
  });

})().catch(e => {
  $.logErr(e);
  $.msg($.name, "❌ 发生错误", e.message || String(e));
  $.done({
    title: $.name,
    content: "脚本运行异常：" + (e.message || e),
    icon: "exclamationmark.triangle",
    "icon-color": "#FF5A5A"
  });
});

// ========== 方法 ==========
function showDisclaimer() {
  const lines = [
    "==============📣免责声明📣==============",
    "本脚本仅用于学习研究，禁止用于商业用途",
    "本脚本不保证准确性、可靠性、完整性和及时性",
    "任何个人或组织均可无需经过通知而自由使用",
    "作者对任何脚本问题概不负责，包括由此产生的任何损失",
    "如有单位或个人认为本脚本侵权，请通知并提供证明，我将删除",
    "请勿将本脚本用于商业用途，由此引起的问题与作者无关",
    "本脚本及其更新版权归作者所有",
    "",
    "⌚ " + nowTime()
  ];
  $.log(lines.join("\n"));
}

function nowTime() {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return y + "/" + m + "/" + day + " " + h + ":" + min + ":" + s;
}

function toBool(val, def) {
  if (val === undefined || val === null || val === "") return def;
  return String(val) === "true";
}

function toNumber(val, def) {
  const n = Number(val);
  return isNaN(n) || n <= 0 ? def : n;
}

function decodeHtml(str) {
  str = str || "";
  return str
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(str) {
  str = str || "";
  return str.replace(/<[^>]*>/g, "");
}

function cleanText(str) {
  return decodeHtml(stripTags(str)).replace(/\s+/g, " ").trim();
}

function normalizeUrl(link) {
  link = (link || "").trim();
  if (!link) return "";
  if (link.indexOf("http://") === 0 || link.indexOf("https://") === 0) return link;
  if (link.charAt(0) === "/") return "http://www.cpta.com.cn" + link;
  if (link.indexOf("./") === 0) link = link.slice(2);
  return "http://www.cpta.com.cn/" + link;
}

function parseDate(dateStr) {
  dateStr = (dateStr || "").replace(/\./g, "-").replace(/\//g, "-");
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function diffDays(dateObj) {
  if (!dateObj) return 9999;
  const now = new Date();
  const diff = now.getTime() - dateObj.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getTimeMarker(dateStr) {
  const days = diffDays(parseDate(dateStr));
  if (days <= Config.recentDaysRed) return "🔴";
  if (days <= Config.recentDaysOrange) return "🟠";
  return "⚪";
}

function getKeywordTag(title) {
  title = title || "";
  if (title.indexOf("监理") !== -1) return "🏗️";
  if (title.indexOf("造价") !== -1) return "💰";
  if (title.indexOf("建造师") !== -1) return "👷";
  return "📌";
}

function makeId(item) {
  return item.date + "__" + item.title;
}

async function httpGet(url) {
  const { body } = await $.http.get({
    url: url,
    headers: {
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
      "Accept-Language": "zh-CN,zh-Hans;q=0.9"
    }
  });
  return body || "";
}

function extractNotices(html) {
  const results = [];

  const pattern1 = /<li[^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<i[^>]*>|<span[^>]*>|<em[^>]*>)\s*\[?(\d{4}[-\/.]\d{2}[-\/.]\d{2})\]?\s*(?:<\/i>|<\/span>|<\/em>)/gi;
  let m;

  while ((m = pattern1.exec(html)) !== null) {
    const link = normalizeUrl(m[1]);
    const title = cleanText(m[2]);
    const date = (m[3] || "").replace(/\./g, "-").replace(/\//g, "-").trim();
    if (title && date) results.push({ title: title, date: date, link: link });
  }

  if (results.length === 0) {
    const pattern2 = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]{0,220}?(\d{4}[-\/.]\d{2}[-\/.]\d{2})/gi;
    while ((m = pattern2.exec(html)) !== null) {
      const link = normalizeUrl(m[1]);
      const title = cleanText(m[2]);
      const date = (m[3] || "").replace(/\./g, "-").replace(/\//g, "-").trim();
      if (title && date) results.push({ title: title, date: date, link: link });
    }
  }

  return results;
}

async function barkNotify(title, subtitle, content, openUrl) {
  const body = {
    title: subtitle ? (title + "\n" + subtitle) : title,
    body: content,
    url: openUrl || "",
    group: Config.barkGroup || "人事考试网公告"
  };
  if (Config.barkAutoCopy) body.automaticallyCopy = "1";
  if (Config.barkSound) body.sound = Config.barkSound;

  return new Promise(resolve => {
    $.post({
      url: Config.barkPush,
      headers: { "content-type": "application/json; charset=utf-8" },
      body: $.toStr(body)
    }, (err, resp, data) => {
      $.log("=========📣 Bark 推送结果 =========");
      if (err) {
        $.logErr(err);
      } else {
        $.log(data || "(empty)");
      }
      resolve();
    });
  });
}

async function telegramNotify(text) {
  return new Promise(resolve => {
    $.post({
      url: "https://api.telegram.org/bot" + Config.tgBotToken + "/sendMessage",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: $.toStr({
        chat_id: Config.tgChatId,
        text: text,
        disable_web_page_preview: Config.tgDisableWebPagePreview
      })
    }, (err, resp, data) => {
      $.log("=========📣 Telegram 推送结果 =========");
      if (err) {
        $.logErr(err);
      } else {
        $.log(data || "(empty)");
      }
      resolve();
    });
  });
}

// ========== 精简 Env ==========
function Env(name) {
  return new class {
    constructor(name) {
      this.name = name;
      this.logLevel = "info";
      this.startTime = Date.now();
      this.http = {
        get: (opts) => new Promise((resolve, reject) => {
          if (opts.params) {
            opts.url += (opts.url.indexOf("?") === -1 ? "?" : "&") + this.queryStr(opts.params);
          }
          $httpClient.get(opts, (err, resp, body) => {
            if (err) reject(err);
            else resolve({ resp: resp, body: body });
          });
        })
      };
      this.log("", "🔔" + this.name + ", 开始!");
    }

    getdata(key) {
      return $persistentStore.read(key);
    }

    setdata(val, key) {
      return $persistentStore.write(String(val), key);
    }

    toObj(str, defVal) {
      try { return JSON.parse(str); } catch { return defVal; }
    }

    toStr(obj, defVal) {
      try { return JSON.stringify(obj); } catch { return defVal; }
    }

    msg(title, sub, body, opts) {
      $notification.post(title || "", sub || "", body || "", opts || {});
    }

    post(opts, cb) {
      $httpClient.post(opts, cb);
    }

    queryStr(obj) {
      let s = "";
      for (const k in obj) {
        if (obj[k] !== null && obj[k] !== undefined && obj[k] !== "") {
          s += k + "=" + encodeURIComponent(obj[k]) + "&";
        }
      }
      return s.replace(/&$/, "");
    }

    info() {
      if (["info", "debug"].indexOf(this.logLevel) !== -1) {
        const args = Array.prototype.slice.call(arguments).map(i => "ℹ️ " + i);
        console.log.apply(console, args);
      }
    }

    debug() {
      if (this.logLevel === "debug") {
        const args = Array.prototype.slice.call(arguments).map(i => "🅱️ " + i);
        console.log.apply(console, args);
      }
    }

    warn() {
      const args = Array.prototype.slice.call(arguments).map(i => "⚠️ " + i);
      console.log.apply(console, args);
    }

    error() {
      const args = Array.prototype.slice.call(arguments).map(i => "❌ " + i);
      console.log.apply(console, args);
    }

    log() {
      console.log.apply(console, arguments);
    }

    logErr(err) {
      console.log("", "❗️" + this.name + ", 错误!", err);
    }

    done(val) {
      const sec = ((Date.now() - this.startTime) / 1000).toFixed(2);
      this.log("", "🔔" + this.name + ", 结束! 🕛 " + sec + " 秒");
      $done(val || {});
    }
  }(name);
}