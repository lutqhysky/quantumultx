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

function decodeHtml(str) { 
  str = str || ""; 
  return str.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">"); 
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
  if (link.indexOf("http") === 0) return link; 
  return "http://www.cpta.com.cn/" + link.replace(/^\//, ""); 
}

function parseDate(dateStr) { 
  dateStr = (dateStr || "").replace(/\./g, "-").replace(/\//g, "-"); 
  const d = new Date(dateStr); 
  return isNaN(d.getTime()) ? null : d; 
}

function diffDays(dateObj) { 
  if (!dateObj) return 9999; 
  const now = new Date(); 
  return Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24)); 
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

function extractNotices(html) {
  const results = [];
  const pattern = /<li[^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?(\d{4}[-\/.]\d{2}[-\/.]\d{2})/gi;
  let m;
  while ((m = pattern.exec(html)) !== null) {
    results.push({ title: cleanText(m[2]), date: m[3].replace(/\./g, "-"), link: normalizeUrl(m[1]) });
  }
  return results;
}

// ========== 推送函数 ==========
async function sendBark(cfg, title, body, url) {
  if (!cfg.barkEnable || !cfg.barkUrl || cfg.barkUrl === "") {
    return;
  }
  
  try {
    let baseUrl = cfg.barkUrl.trim();
    if (!baseUrl.startsWith("http")) {
      baseUrl = "https://" + baseUrl;
    }
    baseUrl = baseUrl.replace(/\/$/, "");
    
    const fullUrl = `${baseUrl}/${encodeURIComponent(title)}/${encodeURIComponent(body)}`;
    
    const params = [];
    if (cfg.barkGroup && cfg.barkGroup !== "") {
      params.push(`group=${encodeURIComponent(cfg.barkGroup)}`);
    }
    if (cfg.barkSound && cfg.barkSound !== "") {
      params.push(`sound=${encodeURIComponent(cfg.barkSound)}`);
    }
    if (cfg.barkAutoCopy) {
      params.push(`automaticallyCopy=1`);
    }
    if (url && url !== "") {
      params.push(`url=${encodeURIComponent(url)}`);
    }
    
    const finalUrl = params.length ? `${fullUrl}?${params.join("&")}` : fullUrl;
    await $.get({ url: finalUrl, timeout: 10000 });
    $.log("✅ Bark推送成功");
    
  } catch (e) {
    $.log(`❌ Bark推送失败: ${e.message}`);
  }
}

async function sendTelegram(cfg, text) {
  if (!cfg.tgEnable || !cfg.tgBotToken || !cfg.tgChatId) {
    return;
  }
  
  try {
    const apiUrl = `https://api.telegram.org/bot${cfg.tgBotToken}/sendMessage`;
    const payload = {
      chat_id: cfg.tgChatId,
      text: text,
      disable_web_page_preview: cfg.tgDisableWebPagePreview,
      parse_mode: "HTML"
    };
    
    const response = await $.post({
      url: apiUrl,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      timeout: 10000
    });
    
    const result = safeJSONParse(response.data, {});
    if (result.ok) {
      $.log("✅ Telegram推送成功");
    } else {
      $.log(`❌ Telegram失败: ${result.description}`);
    }
    
  } catch (e) {
    $.log(`❌ Telegram异常: ${e.message}`);
  }
}

// ========== 主流程 ==========
(async () => {
  const cfg = getConfig();
  
  $.log("=== 人事考试网公告监控 ===");
  $.log(`关键词: ${cfg.keywords.join(" | ")}`);
  
  try {
    const res = await $.get({ url: cfg.url });
    let notices = extractNotices(res.data).filter(item => 
      cfg.keywords.some(k => item.title.indexOf(k) !== -1)
    );
    
    if (!notices.length) {
      $.log("未匹配到公告");
      $.done({ 
        title: SCRIPT_NAME, 
        content: "未匹配到公告"
      });
      return;
    }
    
    $.log(`匹配到 ${notices.length} 条公告`);
    
    // 获取缓存
    let cache = safeJSONParse($.read(STORE_KEYS.latestIds), []);
    let newNotices = [];
    
    // 增量检测
    for (let notice of notices) {
      const id = makeId(notice);
      if (!cache.includes(id)) {
        newNotices.push(notice);
        cache.unshift(id);
      }
    }
    
    // 限制缓存大小
    if (cache.length > cfg.saveLimit) {
      cache = cache.slice(0, cfg.saveLimit);
    }
    $.write(JSON.stringify(cache), STORE_KEYS.latestIds);
    
    $.log(`新增公告: ${newNotices.length} 条`);
    
    // 处理新增公告
    if (newNotices.length > 0) {
      for (let notice of newNotices.slice(0, cfg.maxCount)) {
        const title = `【${SCRIPT_NAME}】${notice.title}`;
        const body = `📅 日期: ${notice.date}\n🔗 链接: ${notice.link}`;
        
        // Surge 通知
        if (cfg.enableNotification) {
          $.notify(title, "", body);
        }
        
        // Bark 推送
        if (cfg.barkEnable && cfg.barkUrl) {
          await sendBark(cfg, title, body, notice.link);
        }
        
        // Telegram 推送
        if (cfg.tgEnable) {
          const tgMessage = `<b>${title}</b>\n\n📅 ${notice.date}\n\n🔗 <a href="${notice.link}">点击查看详情</a>`;
          await sendTelegram(cfg, tgMessage);
        }
        
        // 避免推送过快
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      $.done({
        title: SCRIPT_NAME,
        content: `发现 ${newNotices.length} 条新公告\n\n${newNotices.slice(0, 5).map(n => `• ${n.title}`).join("\n")}`
      });
    } else {
      $.log("没有新公告");
      $.done({
        title: SCRIPT_NAME,
        content: `已是最新\n共监控 ${notices.length} 条公告`
      });
    }
    
  } catch (e) {
    $.log(`脚本错误: ${e.message}`);
    $.done({ 
      title: SCRIPT_NAME, 
      content: `错误: ${e.message}`
    });
  }
})();
