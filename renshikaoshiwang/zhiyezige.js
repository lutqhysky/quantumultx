const $ = new Env("人事考试网考试信息公告");

// 日志等级
$.logLevel = ($.getdata("cpta_debug") === "true") ? "debug" : "info";

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

// ========== 缓存键 ==========
const CacheKeys = {
  latestIds: "cpta_latest_ids",
  inited: "cpta_inited"
};

(async () => {
  $.info("配置", JSON.stringify({
    keywords: Config.keywords,
    maxCount: Config.maxCount,
    onlyNew: Config.onlyNew,
    maxAgeDays: Config.maxAgeDays,
    barkEnable: !!Config.barkPush,
    tgEnable: Config.tgEnable
  }));

  if (Config.clearCache) {
    $.setdata("[]", CacheKeys.latestIds);
    $.setdata("false", CacheKeys.inited);
    $.setdata("false", "cpta_clear_cache");
    $.info("已清空缓存，本次按首次运行处理");
  }

  const html = await httpGet(Config.url);
  if (!html) throw new Error("页面内容为空，可能网站暂时不可用");

  let notices = extractNotices(html);
  if (!notices.length) throw new Error("页面解析失败，可能网站结构已变更");

  notices = notices.filter(item => Config.keywords.some(k => item.title.indexOf(k) !== -1));

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
      if (err) {
        $.logErr(err);
      } else {
        $.info("Bark返回", data);
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
      if (err) {
        $.logErr(err);
      } else {
        $.info("Telegram返回", data);
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

    isNode() { return false; }

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
      if (["info", "debug"].indexOf(this.logLevel) !== -1) console.log("[INFO]", ...arguments);
    }

    debug() {
      if (this.logLevel === "debug") console.log("[DEBUG]", ...arguments);
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