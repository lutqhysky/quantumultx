/*************************************

项目名称：人事考试网关键公告监控
适用平台：Surge（兼容长期 cron 运行）
设计目标：
1. 长期稳定运行
2. 支持增量通知（只提醒新增）
3. 支持参数化，方便以后接入 NEBOX / BoxJS
4. 首次运行可选择仅建立缓存，不通知
5. 手动运行时也能直接看到结果

Surge 任务示例：
[Script]
人事考试网关键公告 = type=cron,cronexp=0 0 9,15 * * *,script-path=https://你的地址/cpta_notice_monitor.js,timeout=30,argument=keywords=监理|造价|建造师&maxCount=10&onlyNew=true&showLink=false&enableNotification=true&firstRunNotify=false

*************************************/

const SCRIPT_NAME = "人事考试网关键公告";

// ========== 默认配置（可被 BoxJS/NEBOX 或 argument 覆盖） ==========
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
  saveLimit: "100"
};

// ========== 持久化键名（以后给 NEBOX / BoxJS 填参数就填这些） ==========
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
  saveLimit: "@cpta.saveLimit",

  latestIds: "@cpta.latestIds",
  inited: "@cpta.inited"
};

// ========== 环境工具 ==========
class Env {
  constructor(name) {
    this.name = name;
    this.isSurge = typeof $httpClient !== "undefined" && typeof $persistentStore !== "undefined";
    this.startTime = Date.now();
    this.logs = [];
  }

  log(...args) {
    console.log(`[${this.name}]`, ...args);
  }

  read(key) {
    if (this.isSurge) return $persistentStore.read(key);
    return null;
  }

  write(value, key) {
    if (this.isSurge) return $persistentStore.write(String(value), key);
    return false;
  }

  get(opts) {
    return new Promise((resolve, reject) => {
      $httpClient.get(opts, (err, resp, data) => {
        if (err) reject(err);
        else resolve({ resp, data });
      });
    });
  }

  notify(title, subtitle = "", body = "") {
    if (typeof $notification !== "undefined") {
      $notification.post(title, subtitle, body);
    }
  }

  done(payload = {}) {
    const cost = ((Date.now() - this.startTime) / 1000).toFixed(2);
    this.log(`执行结束，耗时 ${cost}s`);
    $done(payload);
  }
}

const $ = new Env(SCRIPT_NAME);

// ========== 参数处理 ==========
function parseArgument(str) {
  const obj = {};
  if (!str) return obj;
  str.split("&").forEach(pair => {
    const idx = pair.indexOf("=");
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (key) obj[key] = decodeURIComponent(val);
  });
  return obj;
}

function getConfig() {
  const arg = typeof $argument !== "undefined" ? parseArgument($argument) : {};

  function pick(name, storeKey) {
    return (
      arg[name] ??
      $.read(storeKey) ??
      DEFAULTS[name]
    );
  }

  const cfg = {
    url: pick("url", STORE_KEYS.url),
    keywordsRaw: pick("keywords", STORE_KEYS.keywords),
    maxCount: Number(pick("maxCount", STORE_KEYS.maxCount)),
    onlyNew: String(pick("onlyNew", STORE_KEYS.onlyNew)).toLowerCase() === "true",
    showLink: String(pick("showLink", STORE_KEYS.showLink)).toLowerCase() === "true",
    enableNotification: String(pick("enableNotification", STORE_KEYS.enableNotification)).toLowerCase() === "true",
    firstRunNotify: String(pick("firstRunNotify", STORE_KEYS.firstRunNotify)).toLowerCase() === "true",
    recentDaysRed: Number(pick("recentDaysRed", STORE_KEYS.recentDaysRed)),
    recentDaysOrange: Number(pick("recentDaysOrange", STORE_KEYS.recentDaysOrange)),
    saveLimit: Number(pick("saveLimit", STORE_KEYS.saveLimit))
  };

  cfg.keywords = cfg.keywordsRaw
    .split("|")
    .map(s => s.trim())
    .filter(Boolean);

  if (!cfg.maxCount || cfg.maxCount < 1) cfg.maxCount = 10;
  if (!cfg.saveLimit || cfg.saveLimit < 10) cfg.saveLimit = 100;
  if (!cfg.recentDaysRed || cfg.recentDaysRed < 1) cfg.recentDaysRed = 7;
  if (!cfg.recentDaysOrange || cfg.recentDaysOrange < cfg.recentDaysRed) cfg.recentDaysOrange = 30;

  return cfg;
}

// ========== 工具函数 ==========
function decodeHtml(str = "") {
  return str
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(str = "") {
  return str.replace(/<[^>]*>/g, "");
}

function cleanText(str = "") {
  return decodeHtml(stripTags(str)).replace(/\s+/g, " ").trim();
}

function normalizeUrl(link = "") {
  link = link.trim();
  if (!link) return "";
  if (/^https?:\/\//i.test(link)) return link;
  if (link.startsWith("/")) return "http://www.cpta.com.cn" + link;
  return "http://www.cpta.com.cn/" + link.replace(/^\.?\//, "");
}

function parseDate(dateStr = "") {
  const d = new Date(dateStr.replace(/[/.]/g, "-"));
  return isNaN(d.getTime()) ? null : d;
}

function diffDays(dateObj) {
  if (!dateObj) return 9999;
  const now = new Date();
  const diff = now.getTime() - dateObj.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getMarker(dateStr, cfg) {
  const d = parseDate(dateStr);
  const days = diffDays(d);
  if (days <= cfg.recentDaysRed) return "🔴";
  if (days <= cfg.recentDaysOrange) return "🟠";
  return "⚪";
}

function safeJSONParse(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function makeId(item) {
  return `${item.date}__${item.title}`;
}

// ========== 页面解析 ==========
function extractNotices(html) {
  const results = [];

  // 优先匹配更常见的列表结构
  const pattern1 = /<li[^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<i[^>]*>|<span[^>]*>|<em[^>]*>)\s*\[?(\d{4}[-\/.]\d{2}[-\/.]\d{2})\]?\s*(?:<\/i>|<\/span>|<\/em>)/gi;

  let m;
  while ((m = pattern1.exec(html)) !== null) {
    const link = normalizeUrl(m[1]);
    const title = cleanText(m[2]);
    const date = m[3].replace(/[/.]/g, "-").trim();
    if (title && date) results.push({ title, date, link });
  }

  // 兜底
  if (results.length === 0) {
    const pattern2 = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]{0,220}?(\d{4}[-\/.]\d{2}[-\/.]\d{2})/gi;
    while ((m = pattern2.exec(html)) !== null) {
      const link = normalizeUrl(m[1]);
      const title = cleanText(m[2]);
      const date = m[3].replace(/[/.]/g, "-").trim();
      if (title && date) results.push({ title, date, link });
    }
  }

  return results;
}

// ========== 主逻辑 ==========
(async () => {
  const cfg = getConfig();

  $.log("当前配置：", JSON.stringify({
    url: cfg.url,
    keywords: cfg.keywords,
    maxCount: cfg.maxCount,
    onlyNew: cfg.onlyNew,
    showLink: cfg.showLink,
    enableNotification: cfg.enableNotification,
    firstRunNotify: cfg.firstRunNotify
  }));

  try {
    const { data } = await $.get({
      url: cfg.url,
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
        "Accept-Language": "zh-CN,zh-Hans;q=0.9"
      }
    });

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

    // 关键词筛选
    notices = notices.filter(item =>
      cfg.keywords.some(k => item.title.includes(k))
    );

    if (!notices.length) {
      return $.done({
        title: SCRIPT_NAME,
        content: `⚠️ 没有找到包含关键词（${cfg.keywords.join(" / ")}）的公告`,
        icon: "appletv",
        "icon-color": "#b8b8b8"
      });
    }

    // 去重
    const seen = new Set();
    notices = notices.filter(item => {
      const key = makeId(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // 按日期倒序
    notices.sort((a, b) => {
      const ta = parseDate(a.date)?.getTime() || 0;
      const tb = parseDate(b.date)?.getTime() || 0;
      return tb - ta;
    });

    // 全量展示结果（用于面板）
    const panelList = notices.slice(0, cfg.maxCount);

    // 增量判断
    const oldIds = safeJSONParse($.read(STORE_KEYS.latestIds) || "[]", []);
    const oldSet = new Set(oldIds);
    const newItems = notices.filter(item => !oldSet.has(makeId(item)));

    const hasInited = $.read(STORE_KEYS.inited) === "true";
    const isFirstRun = !hasInited;

    // 保存最新记录
    const latestIds = notices
      .slice(0, cfg.saveLimit)
      .map(item => makeId(item));

    $.write(JSON.stringify(latestIds), STORE_KEYS.latestIds);
    $.write("true", STORE_KEYS.inited);

    // 统计
    const recentRed = panelList.filter(item => diffDays(parseDate(item.date)) <= cfg.recentDaysRed).length;
    const recentOrange = panelList.filter(item => diffDays(parseDate(item.date)) <= cfg.recentDaysOrange).length;

    // 标题
    let panelTitle = SCRIPT_NAME;
    if (recentRed > 0) {
      panelTitle = `${SCRIPT_NAME} — 🔴${recentRed}条近期公告`;
    } else if (recentOrange > 0) {
      panelTitle = `${SCRIPT_NAME} — 🟠${recentOrange}条近30天公告`;
    }

    // 面板内容
    const panelContent = panelList.map((item, idx) => {
      const marker = getMarker(item.date, cfg);
      const line1 = `${idx + 1}. ${marker} ${item.title}`;
      const line2 = `📅 ${item.date}`;
      const line3 = cfg.showLink ? `🔗 ${item.link}` : "";
      return [line1, line2, line3].filter(Boolean).join("\n");
    }).join("\n\n");

    // 通知逻辑
    let notifyTitle = "";
    let notifySub = "";
    let notifyBody = "";
    let shouldNotify = false;

    if (cfg.onlyNew) {
      if (isFirstRun) {
        if (cfg.firstRunNotify && newItems.length > 0) {
          shouldNotify = cfg.enableNotification;
          notifyTitle = `${SCRIPT_NAME}（首次运行）`;
          notifySub = `匹配到 ${newItems.length} 条公告`;
          notifyBody = newItems.slice(0, cfg.maxCount).map((item, idx) => {
            return `${idx + 1}. ${item.title} (${item.date})`;
          }).join("\n");
        }
      } else {
        if (newItems.length > 0) {
          shouldNotify = cfg.enableNotification;
          notifyTitle = `${SCRIPT_NAME} — 发现 ${newItems.length} 条新公告`;
          notifySub = `关键词：${cfg.keywords.join(" / ")}`;
          notifyBody = newItems.slice(0, cfg.maxCount).map((item, idx) => {
            const marker = getMarker(item.date, cfg);
            return `${idx + 1}. ${marker} ${item.title} (${item.date})`;
          }).join("\n");
        }
      }
    } else {
      shouldNotify = cfg.enableNotification;
      notifyTitle = panelTitle;
      notifySub = `关键词：${cfg.keywords.join(" / ")}｜共 ${panelList.length} 条`;
      notifyBody = panelList.map((item, idx) => {
        const marker = getMarker(item.date, cfg);
        return `${idx + 1}. ${marker} ${item.title} (${item.date})`;
      }).join("\n");
    }

    if (shouldNotify) {
      $.notify(notifyTitle, notifySub, notifyBody);
    }

    // 面板信息补充
    const statusLine = isFirstRun
      ? `初始化：首次运行，已建立缓存`
      : `本次新增：${newItems.length} 条`;

    const summaryLine = `关键词：${cfg.keywords.join(" / ")}｜展示：${panelList.length} 条｜模式：${cfg.onlyNew ? "仅新增通知" : "每次通知"}`;

    const iconColor = newItems.length > 0
      ? "#FF5A5A"
      : (recentOrange > 0 ? "#FF9F0A" : "#b8b8b8");

    return $.done({
      title: panelTitle,
      content: `${summaryLine}\n${statusLine}\n\n${panelContent}`,
      icon: "appletv",
      "icon-color": iconColor
    });

  } catch (e) {
    return $.done({
      title: SCRIPT_NAME,
      content: `❌ 运行异常：${e.message}`,
      icon: "appletv",
      "icon-color": "#b8b8b8"
    });
  }
})();