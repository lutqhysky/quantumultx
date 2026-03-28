/*************************************
项目名称：人事考试网关键公告监控 V4 Stable
适用平台：Surge 2026-03-28
*************************************/

const SCRIPT_NAME = "人事考试网关键公告";

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
  latestIds: "@cpta.latestIds"
};

class Env {
  constructor(name) {
    this.name = name;
    this.startTime = Date.now();
  }
  log() {
    console.log("[" + this.name + "]", ...arguments);
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
        else resolve({ resp, data });
      });
    });
  }
  post(opts) {
    return new Promise((resolve, reject) => {
      $httpClient.post(opts, (err, resp, data) => {
        if (err) reject(err);
        else resolve({ resp, data });
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

// ========== 工具函数 ==========
function getBool(val) {
  if (val === undefined || val === null || val === "") return false;
  return String(val).toLowerCase() === "true";
}

function getNum(val, fallback) {
  const n = Number(val);
  return isNaN(n) || n <= 0 ? fallback : n;
}

function getConfig() {
  // 直接从存储读取配置
  const cfg = {
    url: $.read(STORE_KEYS.url) || "http://www.cpta.com.cn/notice.html",
    keywordsRaw: $.read(STORE_KEYS.keywords) || "监理|造价|建造师",
    maxCount: getNum($.read(STORE_KEYS.maxCount), 10),
    onlyNew: getBool($.read(STORE_KEYS.onlyNew)),
    showLink: getBool($.read(STORE_KEYS.showLink)),
    enableNotification: getBool($.read(STORE_KEYS.enableNotification)),
    firstRunNotify: getBool($.read(STORE_KEYS.firstRunNotify)),
    recentDaysRed: getNum($.read(STORE_KEYS.recentDaysRed), 7),
    recentDaysOrange: getNum($.read(STORE_KEYS.recentDaysOrange), 30),
    maxAgeDays: getNum($.read(STORE_KEYS.maxAgeDays), 90),
    saveLimit: getNum($.read(STORE_KEYS.saveLimit), 100),
    clearCache: getBool($.read(STORE_KEYS.clearCache)),
    
    barkEnable: getBool($.read(STORE_KEYS.barkEnable)),
    barkUrl: $.read(STORE_KEYS.barkUrl) || "",
    barkAutoCopy: getBool($.read(STORE_KEYS.barkAutoCopy)),
    barkSound: $.read(STORE_KEYS.barkSound) || "",
    barkGroup: $.read(STORE_KEYS.barkGroup) || "人事考试网公告",
    
    tgEnable: getBool($.read(STORE_KEYS.tgEnable)),
    tgBotToken: $.read(STORE_KEYS.tgBotToken) || "",
    tgChatId: $.read(STORE_KEYS.tgChatId) || "",
    tgDisableWebPagePreview: getBool($.read(STORE_KEYS.tgDisableWebPagePreview))
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
    results.push({ 
      title: cleanText(m[2]), 
      date: m[3].replace(/\./g, "-"), 
      link: normalizeUrl(m[1]) 
    });
  }
  return results;
}

// ========== 推送函数 ==========
async function sendBark(cfg, title, body, url) {
  if (!cfg.barkEnable || !cfg.barkUrl || cfg.barkUrl === "") {
    return false;
  }
  
  return new Promise((resolve) => {
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
      
      $httpClient.get(finalUrl, (err, resp, data) => {
        if (err) {
          $.log(`❌ Bark失败: ${err}`);
          resolve(false);
        } else {
          $.log(`✅ Bark推送成功`);
          resolve(true);
        }
      });
    } catch (e) {
      $.log(`❌ Bark异常: ${e.message}`);
      resolve(false);
    }
  });
}

async function sendTelegram(cfg, text) {
  if (!cfg.tgEnable || !cfg.tgBotToken || !cfg.tgChatId) {
    return false;
  }
  
  return new Promise((resolve) => {
    try {
      const apiUrl = `https://api.telegram.org/bot${cfg.tgBotToken}/sendMessage`;
      const payload = {
        chat_id: cfg.tgChatId,
        text: text,
        disable_web_page_preview: cfg.tgDisableWebPagePreview
      };
      
      $httpClient.post({
        url: apiUrl,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }, (err, resp, data) => {
        if (err) {
          $.log(`❌ Telegram失败: ${err}`);
          resolve(false);
        } else {
          const result = safeJSONParse(data, {});
          if (result.ok) {
            $.log(`✅ Telegram推送成功`);
            resolve(true);
          } else {
            $.log(`❌ Telegram错误: ${result.description}`);
            resolve(false);
          }
        }
      });
    } catch (e) {
      $.log(`❌ Telegram异常: ${e.message}`);
      resolve(false);
    }
  });
}

// ========== 主流程 ==========
(async () => {
  const cfg = getConfig();
  
  $.log("=== 人事考试网公告监控 ===");
  $.log(`关键词: ${cfg.keywords.join(" | ")}`);
  $.log(`Bark: ${cfg.barkEnable ? "启用" : "禁用"} | TG: ${cfg.tgEnable ? "启用" : "禁用"}`);
  
  try {
    // 获取页面
    const res = await $.get({ url: cfg.url });
    let notices = extractNotices(res.data);
    
    // 过滤关键词
    notices = notices.filter(item => 
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
    
    // 检测新公告
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
    
    // 处理新公告
    if (newNotices.length > 0) {
      const notifyList = newNotices.slice(0, cfg.maxCount);
      
      for (let notice of notifyList) {
        const title = `【${SCRIPT_NAME}】${notice.title}`;
        const body = `📅 日期: ${notice.date}\n🔗 ${notice.link}`;
        
        // Surge 本地通知
        if (cfg.enableNotification) {
          $.notify(title, "", body);
        }
        
        // Bark 推送
        if (cfg.barkEnable) {
          await sendBark(cfg, title, body, notice.link);
        }
        
        // Telegram 推送
        if (cfg.tgEnable) {
          const tgMsg = `【${SCRIPT_NAME}】\n\n${notice.title}\n\n📅 ${notice.date}\n\n🔗 ${notice.link}`;
          await sendTelegram(cfg, tgMsg);
        }
        
        // 避免推送过快
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      $.done({
        title: SCRIPT_NAME,
        content: `发现 ${newNotices.length} 条新公告\n\n${notifyList.map(n => `• ${n.title}`).join("\n")}`
      });
    } else {
      $.log("没有新公告");
      $.done({
        title: SCRIPT_NAME,
        content: `已是最新\n共监控 ${notices.length} 条公告`
      });
    }
    
  } catch (e) {
    $.log(`❌ 错误: ${e.message}`);
    $.done({ 
      title: SCRIPT_NAME, 
      content: `错误: ${e.message}`
    });
  }
})();
