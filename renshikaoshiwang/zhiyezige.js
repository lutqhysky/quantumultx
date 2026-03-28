/*************************************
项目名称：人事考试网关键公告监控 V4 Stable
适用平台：Surge
功能：
1. 长期稳定运行
2. 仅新增通知
3. 首次运行仅建缓存
4. 支持关键词分类图标
5. 支持最近 N 天过滤
6. 支持 clearCache 清空缓存
7. 支持 Bark 推送
8. 支持 Telegram 推送（纯文本模式，兼容更稳）
9. 适合后续接入 NEBOX / BoxJS 参数填写
*************************************/

const SCRIPT_NAME = "人事考试网关键公告";

// ========== 默认配置 ==========
const DEFAULTS = {
  url: "http://www.cpta.com.cn/notice.html",
  keywords: "监理|造价|建造师",
  maxCount: "10",
  onlyNew: "true",
  showLink: "false",
  enableNotification: "true",
  firstRunNotify: "false",
  recentDaysRed: "7",
  recentDaysOrange: "30",
  maxAgeDays: "90",
  saveLimit: "100",
  clearCache: "false",

  barkEnable: "false",
  barkUrl: "",
  barkAutoCopy: "false",
  barkSound: "",
  barkGroup: "人事考试网公告",

  tgEnable: "false",
  tgBotToken: "",
  tgChatId: "",
  tgDisableWebPagePreview: "true"
};

// ========== 存储键 ==========
const STORE_KEYS = {
  url: "@cpta.url",
  keywords: "@cpta.keywords",
  maxCount: "@cpta.maxCount",
  onlyNew: "@cpta.onlyNew",
  showLink: "@cpta.showLink",
  enableNotification: "@cpta.enableNotification",
  firstRunNotify: "@cpta.firstRunNotify",
  recentDaysRed: "@cpta.recentDaysRed",
  recentDaysOrange: "@cpta.recentDaysOrange",
  maxAgeDays: "@cpta.maxAgeDays",
  saveLimit: "@cpta.saveLimit",
  clearCache: "@cpta.clearCache",

  barkEnable: "@cpta.barkEnable",
  barkUrl: "@cpta.barkUrl",
  barkAutoCopy: "@cpta.barkAutoCopy",
  barkSound: "@cpta.barkSound",
  barkGroup: "@cpta.barkGroup",

  tgEnable: "@cpta.tgEnable",
  tgBotToken: "@cpta.tgBotToken",
  tgChatId: "@cpta.tgChatId",
  tgDisableWebPagePreview: "@cpta.tgDisableWebPagePreview",

  latestIds: "@cpta.latestIds",
  inited: "@cpta.inited"
};

// ========== 环境 ==========
class Env {
  constructor(name) {
    this.name = name;
    this.startTime = Date.now();
  }

  log() {
    const args = Array.prototype.slice.call(arguments);
    console.log("[" + this.name + "]", ...args);
  }

  read(key) {
    return $persistentStore.read(key);
  }

  write(value, key) {
    return $persistentStore.write(String(value), key);
  }

  get(opts) {
    return new Promise((resolve, reject) => {
      $httpClient.get(opts, (err, resp, data) => {
        if (err) reject(err);
        else resolve({ resp: resp, data: data });
      });
    });
  }

  post(opts) {
    return new Promise((resolve, reject) => {
      $httpClient.post(opts, (err, resp, data) => {
        if (err) reject(err);
        else resolve({ resp: resp, data: data });
      });
    });
  }

  notify(title, subtitle, body) {
    if (typeof $notification !== "undefined") {
      $notification.post(title || "", subtitle || "", body || "");
    }
  }

  done(payload) {
    const cost = ((Date.now() - this.startTime) / 1000).toFixed(2);
    this.log("执行结束，耗时 " + cost + "s");
    $done(payload || {});
  }
}

const $ = new Env(SCRIPT_NAME);

// ========== 参数处理 ==========
function parseArgument(str) {
  const obj = {};
  if (!str) return obj;

  const parts = str.split("&");
  for (let i = 0; i < parts.length; i++) {
    const pair = parts[i];
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (key) obj[key] = decodeURIComponent(val);
  }
  return obj;
}

function getBool(val, fallback) {
  if (val === undefined || val === null || val === "") return fallback;
  return String(val).toLowerCase() === "true";
}

function getNum(val, fallback) {
  const n = Number(val);
  return isNaN(n) || n <= 0 ? fallback : n;
}

function pickValue(arg, name, storeKey) {
  if (arg[name] !== undefined && arg[name] !== null && arg[name] !== "") return arg[name];
  const storeVal = $.read(storeKey);
  if (storeVal !== undefined && storeVal !== null && storeVal !== "") return storeVal;
  return DEFAULTS[name];
}

function getConfig() {
  const arg = typeof $argument !== "undefined" ? parseArgument($argument) : {};

  const cfg = {
    url: pickValue(arg, "url", STORE_KEYS.url),
    keywordsRaw: pickValue(arg, "keywords", STORE_KEYS.keywords),
    maxCount: getNum(pickValue(arg, "maxCount", STORE_KEYS.maxCount), 10),
    onlyNew: getBool(pickValue(arg, "onlyNew", STORE_KEYS.onlyNew), true),
    showLink: getBool(pickValue(arg, "showLink", STORE_KEYS.showLink), false),
    enableNotification: getBool(pickValue(arg, "enableNotification", STORE_KEYS.enableNotification), true),
    firstRunNotify: getBool(pickValue(arg, "firstRunNotify", STORE_KEYS.firstRunNotify), false),
    recentDaysRed: getNum(pickValue(arg, "recentDaysRed", STORE_KEYS.recentDaysRed), 7),
    recentDaysOrange: getNum(pickValue(arg, "recentDaysOrange", STORE_KEYS.recentDaysOrange), 30),
    maxAgeDays: getNum(pickValue(arg, "maxAgeDays", STORE_KEYS.maxAgeDays), 90),
    saveLimit: getNum(pickValue(arg, "saveLimit", STORE_KEYS.saveLimit), 100),
    clearCache: getBool(pickValue(arg, "clearCache", STORE_KEYS.clearCache), false),

    barkEnable: getBool(pickValue(arg, "barkEnable", STORE_KEYS.barkEnable), false),
    barkUrl: pickValue(arg, "barkUrl", STORE_KEYS.barkUrl),
    barkAutoCopy: getBool(pickValue(arg, "barkAutoCopy", STORE_KEYS.barkAutoCopy), false),
    barkSound: pickValue(arg, "barkSound", STORE_KEYS.barkSound),
    barkGroup: pickValue(arg, "barkGroup", STORE_KEYS.barkGroup) || "人事考试网公告",

    tgEnable: getBool(pickValue(arg, "tgEnable", STORE_KEYS.tgEnable), false),
    tgBotToken: pickValue(arg, "tgBotToken", STORE_KEYS.tgBotToken),
    tgChatId: pickValue(arg, "tgChatId", STORE_KEYS.tgChatId),
    tgDisableWebPagePreview: getBool(pickValue(arg, "tgDisableWebPagePreview", STORE_KEYS.tgDisableWebPagePreview), true)
  };

  cfg.keywords = cfg.keywordsRaw.split("|").map(function (s) {
    return s.trim();
  }).filter(function (s) {
    return !!s;
  });

  if (cfg.recentDaysOrange < cfg.recentDaysRed) cfg.recentDaysOrange = 30;

  return cfg;
}

// ========== 工具 ==========
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

function getTimeMarker(dateStr, cfg) {
  const days = diffDays(parseDate(dateStr));
  if (days <= cfg.recentDaysRed) return "🔴";
  if (days <= cfg.recentDaysOrange) return "🟠";
  return "⚪";
}

function getKeywordTag(title) {
  title = title || "";
  if (title.indexOf("监理") !== -1) return "🏗️";
  if (title.indexOf("造价") !== -1) return "💰";
  if (title.indexOf("建造师") !== -1) return "👷";
  return "📌";
}

function safeJSONParse(str, fallback) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return fallback;
  }
}

function makeId(item) {
  return item.date + "__" + item.title;
}

// ========== 页面解析 ==========
function extractNotices(html) {
  const results = [];

  const pattern1 = /<li[^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<i[^>]*>|<span[^>]*>|<em[^>]*>)\s*\[?(\d{4}[-\/.]\d{2}[-\/.]\d{2})\]?\s*(?:<\/i>|<\/span>|<\/em>)/gi;

  let m;
  while ((m = pattern1.exec(html)) !== null) {
    const link = normalizeUrl(m[1]);
    const title = cleanText(m[2]);
    const date = (m[3] || "").replace(/\./g, "-").replace(/\//g, "-").trim();
    if (title && date) {
      results.push({ title: title, date: date, link: link });
    }
  }

  if (results.length === 0) {
    const pattern2 = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]{0,220}?(\d{4}[-\/.]\d{2}[-\/.]\d{2})/gi;
    while ((m = pattern2.exec(html)) !== null) {
      const link = normalizeUrl(m[1]);
      const title = cleanText(m[2]);
      const date = (m[3] || "").replace(/\./g, "-").replace(/\//g, "-").trim();
      if (title && date) {
        results.push({ title: title, date: date, link: link });
      }
    }
  }

  return results;
}

// ========== 推送 ==========
async function sendBark(cfg, title, body, url) {
  if (!cfg.barkEnable || !cfg.barkUrl) return;

  try {
    const barkBody = {
      title: title,
      body: body,
      group: cfg.barkGroup || "人事考试网公告"
    };

    if (url) barkBody.url = url;
    if (cfg.barkAutoCopy) barkBody.automaticallyCopy = "1";
    if (cfg.barkSound) barkBody.sound = cfg.barkSound;

    await $.post({
      url: cfg.barkUrl,
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify(barkBody)
    });

    $.log("Bark 推送成功");
  } catch (e) {
    $.log("Bark 推送失败：", e.message);
  }
}

async function sendTelegram(cfg, text) {
  if (!cfg.tgEnable || !cfg.tgBotToken || !cfg.tgChatId) return;

  try {
    const url = "https://api.telegram.org/bot" + cfg.tgBotToken + "/sendMessage";
    const body = {
      chat_id: cfg.tgChatId,
      text: text,
      disable_web_page_preview: cfg.tgDisableWebPagePreview
    };

    await $.post({
      url: url,
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify(body)
    });

    $.log("Telegram 推送成功");
  } catch (e) {
    $.log("Telegram 推送失败：", e.message);
  }
}

// ========== 主流程 ==========
(async () => {
  const cfg = getConfig();

  $.log("配置：", JSON.stringify({
    keywords: cfg.keywords,
    maxCount: cfg.maxCount,
    onlyNew: cfg.onlyNew,
    maxAgeDays: cfg.maxAgeDays,
    barkEnable: cfg.barkEnable,
    tgEnable: cfg.tgEnable
  }));

  try {
    if (cfg.clearCache) {
      $.write("[]", STORE_KEYS.latestIds);
      $.write("false", STORE_KEYS.inited);
      $.write("false", STORE_KEYS.clearCache);
      $.log("已清空缓存，下次按首次运行处理");
    }

    const res = await $.get({
      url: cfg.url,
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
        "Accept-Language": "zh-CN,zh-Hans;q=0.9"
      }
    });

    const data = res.data;

    if (!data) {
      return $.done({
        title: SCRIPT_NAME,
        content: "❌ 页面内容为空，可能网站暂时不可用",
        icon: "appletv",
        "icon-color": "#b8b8b8"
      });
    }

    let notices = extractNotices(data);

    if (!notices.length) {
      return $.done({
        title: SCRIPT_NAME,
        content: "⚠️ 页面解析失败，可能网站结构已变更",
        icon: "appletv",
        "icon-color": "#b8b8b8"
      });
    }

    notices = notices.filter(function (item) {
      return cfg.keywords.some(function (k) {
        return item.title.indexOf(k) !== -1;
      });
    });

    const seen = new Set();
    notices = notices.filter(function (item) {
      const key = makeId(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    notices = notices.filter(function (item) {
      const d = parseDate(item.date);
      return d && diffDays(d) <= cfg.maxAgeDays;
    });

    notices.sort(function (a, b) {
      const ta = parseDate(a.date) ? parseDate(a.date).getTime() : 0;
      const tb = parseDate(b.date) ? parseDate(b.date).getTime() : 0;
      return tb - ta;
    });

    if (!notices.length) {
      return $.done({
        title: SCRIPT_NAME,
        content: "⚠️ 没有找到最近 " + cfg.maxAgeDays + " 天内包含关键词（" + cfg.keywords.join(" / ") + "）的公告",
        icon: "appletv",
        "icon-color": "#b8b8b8"
      });
    }

    const panelList = notices.slice(0, cfg.maxCount);

    const oldIds = safeJSONParse($.read(STORE_KEYS.latestIds) || "[]", []);
    const oldSet = new Set(oldIds);
    const newItems = notices.filter(function (item) {
      return !oldSet.has(makeId(item));
    });

    const hasInited = $.read(STORE_KEYS.inited) === "true";
    const isFirstRun = !hasInited;

    const latestIds = notices.slice(0, cfg.saveLimit).map(function (item) {
      return makeId(item);
    });
    $.write(JSON.stringify(latestIds), STORE_KEYS.latestIds);
    $.write("true", STORE_KEYS.inited);

    const recentRed = panelList.filter(function (item) {
      return diffDays(parseDate(item.date)) <= cfg.recentDaysRed;
    }).length;

    const recentOrange = panelList.filter(function (item) {
      return diffDays(parseDate(item.date)) <= cfg.recentDaysOrange;
    }).length;

    let panelTitle = SCRIPT_NAME;
    if (recentRed > 0) {
      panelTitle = SCRIPT_NAME + " — 🔴" + recentRed + "条近期公告";
    } else if (recentOrange > 0) {
      panelTitle = SCRIPT_NAME + " — 🟠" + recentOrange + "条近30天公告";
    }

    const panelContent = panelList.map(function (item, idx) {
      const timeMarker = getTimeMarker(item.date, cfg);
      const keywordTag = getKeywordTag(item.title);
      const line1 = (idx + 1) + ". " + timeMarker + " " + keywordTag + " " + item.title;
      const line2 = "📅 " + item.date;
      const arr = [line1, line2];
      if (cfg.showLink) arr.push("🔗 " + item.link);
      return arr.join("\n");
    }).join("\n\n");

    let shouldNotify = false;
    let notifyTitle = "";
    let notifySub = "";
    let notifyBody = "";

    if (cfg.onlyNew) {
      if (isFirstRun) {
        if (cfg.firstRunNotify && panelList.length > 0) {
          shouldNotify = cfg.enableNotification;
          notifyTitle = SCRIPT_NAME + "（首次运行）";
          notifySub = "已建立缓存，当前匹配 " + panelList.length + " 条";
          notifyBody = panelList.map(function (item, idx) {
            const timeMarker = getTimeMarker(item.date, cfg);
            const keywordTag = getKeywordTag(item.title);
            return (idx + 1) + ". " + timeMarker + " " + keywordTag + " " + item.title + " (" + item.date + ")";
          }).join("\n");
        }
      } else {
        if (newItems.length > 0) {
          shouldNotify = cfg.enableNotification;
          notifyTitle = SCRIPT_NAME + " — 发现 " + newItems.length + " 条新公告";
          notifySub = "关键词：" + cfg.keywords.join(" / ");
          notifyBody = newItems.slice(0, cfg.maxCount).map(function (item, idx) {
            const timeMarker = getTimeMarker(item.date, cfg);
            const keywordTag = getKeywordTag(item.title);
            return (idx + 1) + ". " + timeMarker + " " + keywordTag + " " + item.title + " (" + item.date + ")";
          }).join("\n");
        }
      }
    } else {
      shouldNotify = cfg.enableNotification;
      notifyTitle = panelTitle;
      notifySub = "关键词：" + cfg.keywords.join(" / ") + "｜共 " + panelList.length + " 条";
      notifyBody = panelList.map(function (item, idx) {
        const timeMarker = getTimeMarker(item.date, cfg);
        const keywordTag = getKeywordTag(item.title);
        return (idx + 1) + ". " + timeMarker + " " + keywordTag + " " + item.title + " (" + item.date + ")";
      }).join("\n");
    }

    if (shouldNotify) {
      $.notify(notifyTitle, notifySub, notifyBody);

      const pushItems = cfg.onlyNew && !isFirstRun ? newItems.slice(0, cfg.maxCount) : panelList;
      const firstLink = pushItems[0] ? pushItems[0].link : "";

      const barkTitle = notifyTitle;
      const barkBody = pushItems.map(function (item, idx) {
        const timeMarker = getTimeMarker(item.date, cfg);
        const keywordTag = getKeywordTag(item.title);
        let text = (idx + 1) + ". " + timeMarker + " " + keywordTag + " " + item.title + "\n📅 " + item.date;
        if (cfg.showLink) text += "\n🔗 " + item.link;
        return text;
      }).join("\n\n");

      await sendBark(cfg, barkTitle, barkBody, firstLink);

      const tgText = [notifyTitle, notifySub].filter(Boolean).join("\n") + "\n\n" + pushItems.map(function (item, idx) {
        let text = (idx + 1) + ". " + getTimeMarker(item.date, cfg) + " " + getKeywordTag(item.title) + " " + item.title + "\n📅 " + item.date;
        if (item.link) text += "\n🔗 " + item.link;
        return text;
      }).join("\n\n");

      await sendTelegram(cfg, tgText);
    }

    const statusLine = isFirstRun ? "初始化：首次运行，已建立缓存" : "本次新增：" + newItems.length + " 条";
    const summaryLine = "关键词：" + cfg.keywords.join(" / ") + "｜展示：" + panelList.length + " 条｜模式：" + (cfg.onlyNew ? "仅新增通知" : "每次通知") + "｜范围：最近 " + cfg.maxAgeDays + " 天";

    let iconColor = "#b8b8b8";
    if (isFirstRun) {
      iconColor = recentRed > 0 ? "#FF5A5A" : (recentOrange > 0 ? "#FF9F0A" : "#b8b8b8");
    } else {
      iconColor = newItems.length > 0 ? "#FF5A5A" : (recentOrange > 0 ? "#FF9F0A" : "#b8b8b8");
    }

    return $.done({
      title: panelTitle,
      content: summaryLine + "\n" + statusLine + "\n\n" + panelContent,
      icon: "appletv",
      "icon-color": iconColor
    });

  } catch (e) {
    return $.done({
      title: SCRIPT_NAME,
      content: "❌ 运行异常：" + e.message,
      icon: "appletv",
      "icon-color": "#b8b8b8"
    });
  }
})();