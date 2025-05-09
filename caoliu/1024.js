/******************************************
 * @name 某榴特定技术帖(含备选)
 * @channel https://t.me/yqc_123
 * @feedback https://t.me/yqc_777
 * @version 1.3.0
******************************************
## 更新日志
### 20231020 (Original Base)
    1.修复帖子过短问题
    2.强制非文字帖和广告帖
    3.可从BoxJs配置推送帖的方式
### MODIFIED (User Request v4)
    1.优先搜索当天含特定关键字帖子 (尊重BoxJs的isRandom设置)
    2.若无关键字匹配或匹配内容过短，则随机推送当天任一符合基本条件的帖子 (强制随机)
    3.关键字: "兲朝浮世绘", "微语录精选", "微视眼", "历史上的今天" (任一即可)

## 脚本声明
    (声明内容同前，此处省略以减少篇幅)

## 使用方法
    (使用方法同前，URL需要更新为新脚本的地址)

## BoxJs地址
    https://raw.githubusercontent.com/Yuheng0101/X/main/Tasks/boxjs.json
******************************************/
let scriptName = '草榴特定帖(含备选)',
    $ = new Env(scriptName),
    baseURL = 'https://t66y.com/',
    isRandomFromBoxJs = ($.getdata('1024_israndom') || 'false').toString() === 'true';

const anyOfKeywords = ["兲朝浮世绘", "微语录精选", "微视眼", "历史上的今天", "福利"];
const MIN_CONTENT_LENGTH = 100;

!(async () => {
    let finalPost, finalPostContent;
    let isFallback = false;

    // --- Attempt 1: With Keywords ---
    $.log("📢 [阶段1] 尝试搜索当天包含指定关键字的帖子...");
    let keywordPostList = await getPosts(true); // true = useKeywords

    if (keywordPostList && keywordPostList.length > 0) {
        $.log(`[阶段1] 关键字搜索找到 ${keywordPostList.length} 个帖子。尝试筛选内容...`);
        try {
            // Use BoxJs isRandom setting for primary keyword search
            const result = await findValidPost(keywordPostList, isRandomFromBoxJs);
            finalPost = result.post;
            finalPostContent = result.postContent;
            $.log("✅ [阶段1] 成功找到并选择了符合关键字且内容达标的帖子。");
        } catch (e) {
            if (e.message.includes("none had sufficient content length")) {
                $.log("⚠️ [阶段1] 关键字帖子找到，但内容均过短。将尝试备选方案。");
            } else {
                $.log(`⚠️ [阶段1] 尝试关键字帖子时出错: ${e.message}。将尝试备选方案。`);
            }
            // Proceed to fallback if any error in finding a valid keyword post
        }
    } else {
        $.log("ℹ️ [阶段1] 未找到包含指定关键字的当天帖子。将尝试备选方案。");
    }

    // --- Attempt 2: Fallback - All Today's Posts (if primary failed) ---
    if (!finalPost) { // If no post was selected in Attempt 1
        isFallback = true;
        $.log("\n📢 [阶段2 - 备选] 尝试随机推送当天任一帖子 (无关键字限制)...");
        let allTodayPostList = await getPosts(false); // false = do not useKeywords

        if (allTodayPostList && allTodayPostList.length > 0) {
            $.log(`[阶段2] 当天共找到 ${allTodayPostList.length} 个帖子 (无关键字限制)。尝试筛选内容并随机选择...`);
            try {
                // For fallback, always use random selection
                const result = await findValidPost(allTodayPostList, true); // true for forceRandom
                finalPost = result.post;
                finalPostContent = result.postContent;
                $.log("✅ [阶段2] 成功找到并随机选择了当天其他帖子。");
            } catch (e) {
                if (e.message.includes("none had sufficient content length")) {
                    $.msg(scriptName, "提示", "备选方案：今天所有帖子内容均过短，无法推送。");
                    $.log("[阶段2] 备选方案：当天所有帖子内容均过短。");
                } else {
                    $.msg(scriptName, "提示", `备选方案：获取帖子内容时出错: ${e.message}`);
                    $.log(`[阶段2] 备选方案：获取帖子内容时出错: ${e.message}`);
                }
            }
        } else {
            $.msg(scriptName, "提示", "今天没有任何帖子发布。");
            $.log("[阶段2] 备选方案：今天没有任何帖子。");
        }
    }

    // --- Send Notification ---
    if (finalPost && finalPostContent) {
        $.msg(
            `🔔${scriptName}${isFallback ? ' (备选推荐)' : ''}`,
            `《${finalPost.title}》\n【发布时间】\n${$.time('yyyy-MM-dd HH:mm:ss', finalPost.date)}`,
            finalPostContent,
            { 'open-url': finalPost.href }
        );
    } else {
        // If still no finalPost, it means either no posts at all, or all posts were too short.
        // Specific messages would have been sent by stages above.
        // Adding a general "nothing found" if no specific message was yet sent by fallback.
        if (!isFallback) { // If it never even reached fallback stage and failed primary
             $.log("最终：未能找到符合主条件的帖子，且未启动备选。"); // Should be rare
        }
        $.log("最终：未能找到可推送的帖子。");
    }

})()
    .catch((e) => {
        $.log('', `❌ ${$.name}, 致命错误! 原因: ${e}!`, '');
        $.msg($.name, "脚本致命错误", `详情请见日志: ${e.message || e}`);
    })
    .finally(() => $.done());

async function findValidPost(postList, useRandomSelection) {
    if (!postList || postList.length === 0) {
        throw new Error("No posts provided or list is empty.");
    }

    let postsToConsider = [...postList];

    if (useRandomSelection) {
        $.log(`    🔄 随机选择帖子 (从 ${postsToConsider.length} 个中)...`);
        for (let i = postsToConsider.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [postsToConsider[i], postsToConsider[j]] = [postsToConsider[j], postsToConsider[i]];
        }
    } else {
         $.log(`    ▶️ 顺序选择帖子 (从 ${postsToConsider.length} 个中，通常为最新)...`);
    }

    for (let i = 0; i < postsToConsider.length; i++) {
        const post = postsToConsider[i];
        try {
            $.log(`    ⏳ 正在检查帖子 (${i+1}/${postsToConsider.length}): "${post.title}"`);
            const postContent = await getPostContent(post);
            if (postContent.length >= MIN_CONTENT_LENGTH) {
                $.log(`    ✅ 找到内容达标帖子: "${post.title}"`);
                return { post, postContent };
            } else {
                $.log(`    ⬇️ 内容过短 (${postContent.length}/${MIN_CONTENT_LENGTH}字): "${post.title}"`);
            }
        } catch (contentError) {
            $.log(`    ⚠️ 获取 "${post.title}" 内容出错: ${contentError}. 跳过...`);
        }
    }
    
    throw new Error(`Found ${postList.length} potential posts, but none had sufficient content length (>=${MIN_CONTENT_LENGTH}).`);
}

function getPosts(filterByKeywords) {
    const url = baseURL + 'thread0806.php?fid=7&search=today'; 
    $.log(`Fetching posts from: ${url} (关键字过滤: ${filterByKeywords ? '是' : '否'})`);

    return new Promise(async (resolve, reject) => {
        try {
            const html = await Request({ url, method: 'get', use_proxy: true });
            if (!html) {
                reject('获取帖子列表HTML失败 (返回为空)');
                return;
            }

            const tbodyMatch = html.replace(/\n|\s|\r/g, '').match(/<tbody.*?id=\"tbody\">(.*?)<\/tbody>/g);
            if (!tbodyMatch || !tbodyMatch[0]) {
                $.log("HTML解析错误: 无法匹配到主要的 <tbody> 结构。");
                resolve([]); return;
            }
            const innerTbodyMatch = tbodyMatch[0].match(/<tbodystyle=\"table-layout:fixed;\"id=\"tbody\">(.*?)<\/tbody>/);
            if (!innerTbodyMatch || !innerTbodyMatch[1]) {
                $.log("HTML解析错误: 无法匹配到内部的 <tbody> 结构。");
                resolve([]); return;
            }
            const postRows = innerTbodyMatch[1].match(/<trclass=\"tr3t_onetac"\>(.*?)<\/tr>/g);
            if (!postRows) {
                $.log("页面上未找到帖子行 (tr elements)。");
                resolve([]); return;
            }

            let countBeforeFilter = postRows.length;
            var posts = postRows
                .map((item) => {
                    try {
                        const match = item.match(
                            /<h3><ahref=\"(.*?)\".*?>(.*?)<\/a><\/h3>.*?data-timestamp=\"(.*?)\"/
                        );
                        if (!match) return null;
                        let [, href, title, dateStr] = match;
                        title = title.replace(/<.*?>/g, '').trim();
                        const postTimestamp = parseInt(dateStr, 10) * 1000; 
                        return { href: baseURL + href, title, date: postTimestamp };
                    } catch (e) { return null; }
                })
                .filter(item => item && item.title && item.date)
                .filter((item) => {
                    // Basic "P" filter (for image/multi-page threads)
                    if (/[\d+P]/.test(item.title)) { 
                        return false;
                    }

                    // Apply keyword filter only if requested
                    if (filterByKeywords) {
                        const titleContainsAnyKeyword = anyOfKeywords.some(keyword => item.title.includes(keyword));
                        if (!titleContainsAnyKeyword) {
                            return false;
                        }
                    }
                    return true;
                });
            
            $.log(`解析到 ${countBeforeFilter} 行, 筛选后剩余 ${posts.length} 个帖子。`);
            resolve(posts);
        } catch (e) {
            $.logErr('getPosts 函数内严重错误', e);
            reject(e || '获取帖子列表失败');
        }
    });
}

function getPostContent(obj) {
    let { href, title } = obj; // date is not used here but available
    return new Promise(async (resolve, reject) => {
        try {
            const html = await Request({ url: href, method: 'get', use_proxy: true });
            if (!html) {
                reject(`获取《${title}》内容失败 (返回为空)`); return;
            }
            
            const tdMatch = html.replace(/\n|\s|\r/g, '').match(/<tdbgcolor.*?valign=\"top\">(.*?)<\/td>/);
            if (!tdMatch || !tdMatch[0]) {
                reject(`无法在《${title}》中匹配到tdbgcolor内容区域`); return;
            }

            const divMatch = tdMatch[0].match(/<div.*?id=\"conttpc\">(.*?)<\/div>/);
            if(!divMatch || !divMatch[1]) {
                reject(`无法在《${title}》中匹配到conttpc的div`); return;
            }

            var postContent = divMatch[1]
                .replace(/<br><br>/g, '\n').replace(/<br>/g, '\n')
                .replace(/ /g, ' ').replace(/&/g, '&')
                .replace(/"/g, '"').replace(/</g, '<')
                .replace(/>/g, '>').replace(/<.*?>/g, '')
                .trim();
            resolve(postContent);
        } catch (e) {
            // $.logErr(`获取帖子《${title}》内容时出错`, e); // Error logged by findValidPost
            reject(e.message || `获取《${title}》内容失败 (未知解析错误)`);
        }
    });
}

function Request(options) {
    // ... (Request function remains the same)
    if (!options.method) throw '请求方式未指定';
    const method = options.method.toLocaleLowerCase();
    if ($.isNode() && options?.use_proxy) {
        const tunnel = require('tunnel');
        const agent = {
            https: tunnel.httpsOverHttp({
                proxy: { host: '127.0.0.1', port: 7890 }
            })
        };
        Object.assign(options, { agent });
    }
    return new Promise((resolve, reject) => {
        $.http[method](options)
            .then((response) => {
                if (response && response.body) {
                    resolve(response.body);
                } else if (response && response.statusCode && response.statusCode !== 200) {
                     reject(`请求失败，状态码: ${response.statusCode}`);
                }
                else {
                    reject('Response body is empty or undefined, or response object is null.');
                }
            })
            .catch((err) => reject(err));
    });
}

// prettier-ignore
// Env function (remains the same, omitted for brevity but should be included in your final .js file)
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,a)=>{s.call(this,t,(t,s,r)=>{t?a(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}getEnv(){return"undefined"!=typeof $environment&&$environment["surge-version"]?"Surge":"undefined"!=typeof $environment&&$environment["stash-version"]?"Stash":"undefined"!=typeof module&&module.exports?"Node.js":"undefined"!=typeof $task?"Quantumult X":"undefined"!=typeof $loon?"Loon":"undefined"!=typeof $rocket?"Shadowrocket":void 0}isNode(){return"Node.js"===this.getEnv()}isQuanX(){return"Quantumult X"===this.getEnv()}isSurge(){return"Surge"===this.getEnv()}isLoon(){return"Loon"===this.getEnv()}isShadowrocket(){return"Shadowrocket"===this.getEnv()}isStash(){return"Stash"===this.getEnv()}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const a=this.getdata(t);if(a)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,a)=>e(a))})}runScript(t,e){return new Promise(s=>{let a=this.getdata("@chavy_boxjs_userCfgs.httpapi");a=a?a.replace(/\n/g,"").trim():a;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[i,o]=a.split("@"),n={url:`http://${o}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":i,Accept:"*/*"},timeout:r};this.post(n,(t,e,a)=>s(a))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),a=!s&&this.fs.existsSync(e);if(!s&&!a)return{};{const a=s?t:e;try{return JSON.parse(this.fs.readFileSync(a))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),a=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):a?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const a=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of a)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,a)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[a+1])>>0==+e[a+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,a]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,a,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,a,r]=/^@(.*?)\.(.*?)$/.exec(e),i=this.getval(a),o=a?"null"===i?null:i||"{}":"{}";try{const e=JSON.parse(o);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),a)}catch(e){const i={};this.lodash_set(i,r,t),s=this.setval(JSON.stringify(i),a)}}else s=this.setval(t,e);return s}getval(t){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.read(t);case"Quantumult X":return $prefs.valueForKey(t);case"Node.js":return this.data=this.loaddata(),this.data[t];default:return this.data&&this.data[t]||null}}setval(t,e){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.write(t,e);case"Quantumult X":return $prefs.setValueForKey(t,e);case"Node.js":return this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0;default:return this.data&&this.data[e]||null}}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){switch(t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"],delete t.headers["content-type"],delete t.headers["content-length"]),t.params&&(t.url+="?"+this.queryStr(t.params)),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,a)=>{!t&&s&&(s.body=a,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,a)});break;case"Quantumult X":this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:a,headers:r,body:i,bodyBytes:o}=t;e(null,{status:s,statusCode:a,headers:r,body:i,bodyBytes:o},i,o)},t=>e(t&&t.error||"UndefinedError"));break;case"Node.js":let s=require("iconv-lite");this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:a,statusCode:r,headers:i,rawBody:o}=t,n=s.decode(o,this.encoding);e(null,{status:a,statusCode:r,headers:i,rawBody:o,body:n},n)},t=>{const{message:a,response:r}=t;e(a,r,r&&s.decode(r.rawBody,this.encoding))})}}post(t,e=(()=>{})){const s=t.method?t.method.toLocaleLowerCase():"post";switch(t.body&&t.headers&&!t.headers["Content-Type"]&&!t.headers["content-type"]&&(t.headers["content-type"]="application/x-www-form-urlencoded"),t.headers&&(delete t.headers["Content-Length"],delete t.headers["content-length"]),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient[s](t,(t,s,a)=>{!t&&s&&(s.body=a,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,a)});break;case"Quantumult X":t.method=s,this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:a,headers:r,body:i,bodyBytes:o}=t;e(null,{status:s,statusCode:a,headers:r,body:i,bodyBytes:o},i,o)},t=>e(t&&t.error||"UndefinedError"));break;case"Node.js":let a=require("iconv-lite");this.initGotEnv(t);const{url:r,...i}=t;this.got[s](r,i).then(t=>{const{statusCode:s,statusCode:r,headers:i,rawBody:o}=t,n=a.decode(o,this.encoding);e(null,{status:s,statusCode:r,headers:i,rawBody:o,body:n},n)},t=>{const{message:s,response:r}=t;e(s,r,r&&a.decode(r.rawBody,this.encoding))})}}time(t,e=null){const s=e?new Date(e):new Date;let a={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in a)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?a[e]:("00"+a[e]).substr((""+a[e]).length)));return t}queryStr(t){let e="";for(const s in t){let a=t[s];null!=a&&""!==a&&("object"==typeof a&&(a=JSON.stringify(a)),e+=`${s}=${a}&`)}return e=e.substring(0,e.length-1),e}msg(e=t,s="",a="",r){const i=t=>{switch(typeof t){case void 0:return t;case"string":switch(this.getEnv()){case"Surge":case"Stash":default:return{url:t};case"Loon":case"Shadowrocket":return t;case"Quantumult X":return{"open-url":t};case"Node.js":return}case"object":switch(this.getEnv()){case"Surge":case"Stash":case"Shadowrocket":default:{let e=t.url||t.openUrl||t["open-url"];return{url:e}}case"Loon":{let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}case"Quantumult X":{let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl,a=t["update-pasteboard"]||t.updatePasteboard;return{"open-url":e,"media-url":s,"update-pasteboard":a}}case"Node.js":return}default:return}};if(!this.isMute)switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:$notification.post(e,s,a,i(r));break;case"Quantumult X":$notify(e,s,a,i(r));break;case"Node.js":}if(!this.isMuteLog){let t=["","==============📣系统通知📣=============="];t.push(e),s&&t.push(s),a&&t.push(a),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const msg = e && e.stack ? e.stack : (e || ''); switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Quantumult X":default:this.log("",`❗️${this.name}, 错误!`,t,msg);break;case"Node.js":this.log("",`❗️${this.name}, 错误!`,t,msg)}}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;switch(this.log("",`🔔${this.name}, 结束! 🕛 ${s} 秒`),this.log(),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Quantumult X":default:$done(t);break;case"Node.js":process.exit(1)}}}(t,e)}
