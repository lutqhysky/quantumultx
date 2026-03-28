/*************************************
项目名称：人事考试网关键公告监控 V4 Stable (Optimized)
适用平台：Surge
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

class Env {
  constructor(name) {
    this.name = name;
    this.startTime = Date.now();
  }
  log() {
    const args = Array.prototype.slice.call(arguments);
    console.log("[" + this.name + "]", ...args);
  }
  read(key) { return $persistentStore.read(key); }
  write(value, key) { return $persistentStore.write(String(value), key); }
  get(opts) {
    return new Promise((resolve, reject) => {
      $httpClient.get(opts, (err, resp, data) => {
        if (err) reject(err); else resolve({ resp, data });
      });
    });
  }
  post(opts) {
    return new Promise((resolve, reject) => {
      $httpClient.post(opts, (err, resp, data) => {
        if (err) reject(err); else resolve({ resp, data });
      });
    });
  }
  notify(title, subtitle, body) {
    if (typeof $notification !== "undefined") $notification.post(title || "", subtitle || "", body || "");
  }
  done(payload) {
    const cost = ((Date.now() - this.startTime) / 1000).toFixed(2);
    this.log("执行结束，耗时 " + cost + "s");
    $done(payload || {});
  }
}

const $ = new Env(SCRIPT_NAME);

// ========== 工具函数 ==========
function parseArgument(str) {
  const obj = {};
  if (!str) return obj;
  str.split("&").forEach(pair => {
    const idx = pair.indexOf("=");
    if (idx !== -1) obj[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
  });
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
  // 核心逻辑：确保空值会被 fallback 到默认值
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
    barkGroup: pickValue(arg, "barkGroup", STORE_KEYS.barkGroup),
    tgEnable: getBool(pickValue(arg, "tgEnable", STORE_KEYS.tgEnable), false),
    tgBotToken: pickValue(arg, "tgBotToken", STORE_KEYS.tgBotToken),
    tgChatId: pickValue(arg, "tgChatId", STORE_KEYS.tgChatId),
    tgDisableWebPagePreview: getBool(pickValue(arg, "tgDisableWebPagePreview", STORE_KEYS.tgDisableWebPagePreview), true)
  };
  cfg.keywords = cfg.keywordsRaw.split("|").map(s => s.trim()).filter(s => !!s);
  return cfg;
}

// (解析工具函数 decodeHtml, stripTags, cleanText, normalizeUrl, parseDate, diffDays, getTimeMarker, getKeywordTag, safeJSONParse, makeId, extractNotices 保持不变...)
function decodeHtml(str) { str = str || ""; return str.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">"); }
function stripTags(str) { str = str || ""; return str.replace(/<[^>]*>/g, ""); }
function cleanText(str) { return decodeHtml(stripTags(str)).replace(/\s+/g, " ").trim(); }
function normalizeUrl(link) { link = (link || "").trim(); if (!link) return ""; if (link.indexOf("http") === 0) return link; return "http://www.cpta.com.cn/" + link.replace(/^\//, ""); }
function parseDate(dateStr) { dateStr = (dateStr || "").replace(/\./g, "-").replace(/\//g, "-"); const d = new Date(dateStr); return isNaN(d.getTime()) ? null : d; }
function diffDays(dateObj) { if (!dateObj) return 9999; const now = new Date(); return Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24)); }
function getTimeMarker(dateStr, cfg) { const days = diffDays(parseDate(dateStr)); if (days <= cfg.recentDaysRed) return "🔴"; if (days <= cfg.recentDaysOrange) return "🟠"; return "⚪"; }
function getKeywordTag(title) { title = title || ""; if (title.indexOf("监理") !== -1) return "🏗️"; if (title.indexOf("造价") !== -1) return "💰"; if (title.indexOf("建造师") !== -1) return "👷"; return "📌"; }
function safeJSONParse(str, fallback) { try { return JSON.parse(str); } catch (e) { return fallback; } }
function makeId(item) { return item.date + "__" + item.title; }

function extractNotices(html) {
  const results = [];
  const pattern = /<li[^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?(\d{4}[-\/.]\d{2}[-\/.]\d{2})/gi;
  let m;
  while ((m = pattern.exec(html)) !== null) {
    results.push({ title: cleanText(m[2]), date: m[3].replace(/\./g, "-"), link: normalizeUrl(m[1]) });
  }
  return results;
}

// ========== 推送增强版 ==========
async function sendBark(cfg, title, body, url) {
  if (!cfg.barkEnable || !cfg.barkUrl) return;
  try {
    const fullUrl = cfg.barkUrl.endsWith('/') ? cfg.barkUrl : cfg.barkUrl + '/';
    const requestUrl = `${fullUrl}${encodeURIComponent(title)}/${encodeURIComponent(body)}?group=${encodeURIComponent(cfg.barkGroup || "CPTA")}${url ? `&url=${encodeURIComponent(url)}` : ""}`;
    await $.get({ url: requestUrl });
    $.log("Bark 推送成功");
  } catch (e) { $.log("Bark 推送异常: " + e.message); }
}

async function sendTelegram(cfg, text) {
  if (!cfg.tgEnable || !cfg.tgBotToken || !cfg.tgChatId) return;
  try {
    const url = `https://api.telegram.org/bot${cfg.tgBotToken}/sendMessage`;
    const body = {
      chat_id: Number(cfg.tgChatId), // 确保是数字
      text: text,
      disable_web_page_preview: cfg.tgDisableWebPagePreview
    };
    const res = await $.post({
      url: url,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      timeout: 10000
    });
    const resp = safeJSONParse(res.data, {});
    if (resp.ok) $.log("Telegram 推送成功");
    else $.log("Telegram 报错: " + JSON.stringify(resp));
  } catch (e) { $.log("Telegram 网络异常: " + e.message); }
}

// ========== 主流程 ==========
(async () => {
  const cfg = getConfig();
  $.log(`当前关键词: ${cfg.keywords.join("|")}`);

  try {
    if (cfg.clearCache) {
      $.write("[]", STORE_KEYS.latestIds);
      $.write("false", STORE_KEYS.inited);
      $.write("false", STORE_KEYS.clearCache);
      $.log("缓存已清空");
    }

    const res = await $.get({ url: cfg.url });
    let notices = extractNotices(res.data).filter(item => 
      cfg.keywords.some(k => item.title.indexOf(k) !== -1) && 
      diffDays(parseDate(item.date)) <= cfg.maxAgeDays
    );

    if (!notices.length) return $.done({ title: SCRIPT_NAME, content: "未匹配到相关公告" });

    notices.sort((a, b) => parseDate(b.date) - parseDate(a.date));
    
    const oldIds = safeJSONParse($.read(STORE_KEYS.latestIds) || "[]", []);
    const newItems = notices.filter(item => !oldIds.includes(makeId(item)));
    const isFirstRun = $.read(STORE_KEYS.inited) !== "true";

    // 更新持久化数据
    $.write(JSON.stringify(notices.slice(0, cfg.saveLimit).map(makeId)), STORE_KEYS.latestIds);
    $.write("true", STORE_KEYS.inited);

    // 确定是否推送
    let shouldNotify = false;
    let pushContent = "";
    
    if (!cfg.onlyNew) {
      shouldNotify = true;
      pushContent = notices.slice(0, cfg.maxCount);
    } else if (isFirstRun && cfg.firstRunNotify) {
      shouldNotify = true;
      pushContent = notices.slice(0, cfg.maxCount);
    } else if (newItems.length > 0) {
      shouldNotify = true;
      pushContent = newItems;
    }

    // 调试开关：如果你现在就在调试推送，请取消下面这行的注释
    // shouldNotify = true; pushContent = notices.slice(0,1);

    if (shouldNotify && cfg.enableNotification) {
      const title = `${SCRIPT_NAME}${newItems.length ? ` - 发现${newItems.length}条更新` : ""}`;
      const body = pushContent.map((item, i) => `${i+1}. ${getTimeMarker(item.date, cfg)} ${item.title} (${item.date})`).join("\n");
      
      $.notify(title, "", body);
      await sendBark(cfg, title, body, pushContent[0].link);
      await sendTelegram(cfg, `${title}\n\n${body}`);
    }

    $.done({
      title: SCRIPT_NAME,
      content: `关键词: ${cfg.keywords.join("/")}\n新增: ${newItems.length} 条\n\n` + notices.slice(0, cfg.maxCount).map(item => `${getTimeMarker(item.date, cfg)} ${item.title}`).join("\n")
    });

  } catch (e) {
    $.log("出错: " + e.message);
    $.done({ title: SCRIPT_NAME, content: "异常: " + e.message });
  }
})();
