/*************************************
项目名称：人事考试网关键公告监控 V4 Stable
适用平台：Surge
支持：NEBOX 配置
*************************************/

const SCRIPT_NAME = "人事考试网关键公告";

// ========== 存储键 ==========
const STORE_KEYS = {
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

// ========== 解析 NEBOX 传递的参数 ==========
function parseArgument(str) {
  const obj = {};
  if (!str) return obj;
  
  // 解析 URL 参数格式: key1=value1&key2=value2
  str.split("&").forEach(pair => {
    const idx = pair.indexOf("=");
    if (idx !== -1) {
      const key = pair.slice(0, idx).trim();
      const value = decodeURIComponent(pair.slice(idx + 1).trim());
      obj[key] = value;
    }
  });
  return obj;
}

// ========== 获取配置（优先 NEBOX 参数）==========
function getConfig() {
  // 获取 NEBOX 传递的参数
  const arg = typeof $argument !== "undefined" ? parseArgument($argument) : {};
  
  // 调试：打印接收到的参数
  $.log("=== 接收到的 NEBOX 参数 ===");
  for (const [key, value] of Object.entries(arg)) {
    if (key.includes("token") || key.includes("key")) {
      $.log(`${key}: ${value ? "***已设置***" : "空"}`);
    } else {
      $.log(`${key}: ${value || "空"}`);
    }
  }
  
  // 辅助函数
  const getBool = (val, fallback = false) => {
    if (val === undefined || val === null || val === "") return fallback;
    return String(val).toLowerCase() === "true";
  };
  
  const getNum = (val, fallback) => {
    const n = Number(val);
    return isNaN(n) || n <= 0 ? fallback : n;
  };
  
  // 获取配置（优先使用 NEBOX 参数，其次使用默认值）
  const cfg = {
    url: arg.url || "http://www.cpta.com.cn/notice.html",
    keywordsRaw: arg.keywords || "监理|造价|建造师",
    maxCount: getNum(arg.maxCount, 10),
    onlyNew: getBool(arg.onlyNew, true),
    showLink: getBool(arg.showLink, false),
    enableNotification: getBool(arg.enableNotification, true),
    firstRunNotify: getBool(arg.firstRunNotify, false),
    recentDaysRed: getNum(arg.recentDaysRed, 7),
    recentDaysOrange: getNum(arg.recentDaysOrange, 30),
    maxAgeDays: getNum(arg.maxAgeDays, 90),
    saveLimit: getNum(arg.saveLimit, 100),
    clearCache: getBool(arg.clearCache, false),
    
    barkEnable: getBool(arg.barkEnable, false),
    barkUrl: arg.barkUrl || "",
    barkAutoCopy: getBool(arg.barkAutoCopy, false),
    barkSound: arg.barkSound || "",
    barkGroup: arg.barkGroup || "人事考试网公告",
    
    tgEnable: getBool(arg.tgEnable, false),
    tgBotToken: arg.tgBotToken || "",
    tgChatId: arg.tgChatId || "",
    tgDisableWebPagePreview: getBool(arg.tgDisableWebPagePreview, true)
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
function sendBark(cfg, title, body, url) {
  return new Promise((resolve) => {
    if (!cfg.barkEnable || !cfg.barkUrl) {
      resolve(false);
      return;
    }
    
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
  });
}

function sendTelegram(cfg, text) {
  return new Promise((resolve) => {
    if (!cfg.tgEnable || !cfg.tgBotToken || !cfg.tgChatId) {
      resolve(false);
      return;
    }
    
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
  });
}

// ========== 主流程 ==========
(async () => {
  const cfg = getConfig();
  
  $.log("=== 人事考试网公告监控 ===");
  $.log(`关键词: ${cfg.keywords.join(" | ")}`);
  $.log(`Bark: ${cfg.barkEnable ? "✅ 启用" : "❌ 禁用"} | TG: ${cfg.tgEnable ? "✅ 启用" : "❌ 禁用"}`);
  
  if (cfg.barkEnable && cfg.barkUrl) {
    $.log(`Bark URL: ${cfg.barkUrl.substring(0, 50)}...`);
  }
  if (cfg.tgEnable && cfg.tgBotToken) {
    $.log(`TG ChatID: ${cfg.tgChatId}`);
  }
  
  try {
    const res = await $.get({ url: cfg.url });
    let notices = extractNotices(res.data);
    
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
    
    let cache = safeJSONParse($.read(STORE_KEYS.latestIds), []);
    let newNotices = [];
    
    for (let notice of notices) {
      const id = makeId(notice);
      if (!cache.includes(id)) {
        newNotices.push(notice);
        cache.unshift(id);
      }
    }
    
    if (cache.length > cfg.saveLimit) {
      cache = cache.slice(0, cfg.saveLimit);
    }
    $.write(JSON.stringify(cache), STORE_KEYS.latestIds);
    
    $.log(`新增公告: ${newNotices.length} 条`);
    
    if (newNotices.length > 0) {
      const notifyList = newNotices.slice(0, cfg.maxCount);
      
      for (let notice of notifyList) {
        const title = `【${SCRIPT_NAME}】${notice.title}`;
        const body = `📅 日期: ${notice.date}\n🔗 ${notice.link}`;
        
        if (cfg.enableNotification) {
          $.notify(title, "", body);
        }
        
        if (cfg.barkEnable) {
          await sendBark(cfg, title, body, notice.link);
        }
        
        if (cfg.tgEnable) {
          const tgMsg = `【${SCRIPT_NAME}】\n\n${notice.title}\n\n📅 ${notice.date}\n\n🔗 ${notice.link}`;
          await sendTelegram(cfg, tgMsg);
        }
        
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
