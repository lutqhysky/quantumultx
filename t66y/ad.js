/*
@name 磁力解析增强版Rewrite（复制按钮统一复制完整magnet链接）
@desc 拦截网页提取BT磁力链接，去除广告，自定义UI，自动复制
*/
try {
    let body = $response.body || "";

    // 0. 防重检测：已经是解析完成页面直接返回，避免循环重写
    if (/magnet:\?xt=urn:btih:[0-9a-fA-F]{40}/.test(body) && body.indexOf('资源解析成功') !== -1) {
        $done({ body });
        return;
    }

    // 1. 清理广告、反爬脚本
    body = body.replace(/<script src="[^"]*rm\.\d+\.\d+\.js"><\/script>/gi, "");
    body = body.replace(/var (rmJson|poJson)\s*=\s*'\[.*?\]';/gi, "var $1 = '[]';");

    // 2. 提取文件名，清洗特殊字符
    let nameMatch = body.match(/"n"\s*:\s*"([^"]+)"/i) || body.match(/<title>(.*?)<\/title>/i);
    let fileName = "未知资源文件";
    if (nameMatch && nameMatch[1]) {
        fileName = nameMatch[1]
            .replace(/<[^>]+>/g, "")
            .replace(/[\r\n\t]/g, " ")
            .trim();
    }
    // html转义，防止XSS注入
    fileName = fileName.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    // 3. 提取BT HASH，40位十六进制
    const hashReg = /\b([a-fA-F0-9]{40})\b/g;
    let hashArr = [];
    let tempMatch;
    while ((tempMatch = hashReg.exec(body)) !== null) {
        hashArr.push(tempMatch[1].toUpperCase());
    }
    let hash = hashArr.length > 0 ? hashArr[0] : null;

    // 没有hash，直接返回原始页面
    if (!hash) {
        $done({ body });
        return;
    }

    let magnet = "magnet:?xt=urn:btih:" + hash;

    // 4. HTML UI
    let cleanHTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>${fileName}</title>
    <style>
        * { box-sizing: border-box !important; }
        :root {
            --bg:#f0f2f5;
            --card-bg:#ffffff;
            --text-main:#1a1a1a;
            --text-sub:#666666;
            --info-bg:#f8f9fa;
            --mag-border:#4caf50;
            --mag-bg:#f4fbf5;
            --mag-text:#2e7d32;
            --btn:#10b981;
            --fail:#ef4444;
        }
        @media (prefers-color-scheme: dark) {
            :root {
                --bg:#121212;
                --card-bg:#1e1e1e;
                --text-main:#eeeeee;
                --text-sub:#aaaaaa;
                --info-bg:#2a2a2a;
                --mag-border:#27ae60;
                --mag-bg:#142e1c;
                --mag-text:#72e294;
            }
        }
        body {
            margin: 0 !important;
            padding: 20px !important;
            background: var(--bg) !important;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            min-height: 100vh !important;
        }
        .card {
            width: 100% !important;
            max-width: 480px !important;
            background: var(--card-bg) !important;
            padding: 25px !important;
            border-radius: 16px !important;
            box-shadow: 0 10px 25px rgba(0,0,0,0.12) !important;
            text-align: center !important;
        }
        .icon { font-size: 36px !important; margin-bottom: 10px !important; }
        h2 {
            font-size: 18px !important;
            color: var(--text-main) !important;
            margin: 10px 0 !important;
        }
        .file-info {
            background: var(--info-bg) !important;
            padding: 12px !important;
            border-radius: 8px !important;
            margin: 15px 0 !important;
            font-size: 14px !important;
            color: var(--text-main) !important;
            word-break: break-all !important;
            text-align: left !important;
        }
        .hash-info {
            font-size:12px;
            color:var(--text-sub);
            text-align:left;
            margin:4px 0 12px;
            word-break:break-all;
        }
        .mag-box {
            background: var(--mag-bg) !important;
            border: 1.5px solid var(--mag-border) !important;
            padding: 10px !important;
            border-radius: 8px !important;
            font-size: 12px !important;
            color: var(--mag-text) !important;
            word-break: break-all !important;
            margin-bottom: 12px !important;
            font-family: monospace !important;
            cursor: pointer !important;
            user-select:text !important;
        }
        .btn-row { display:flex; gap:10px; margin-bottom:12px; }
        .btn {
            flex:1;
            display:block !important;
            padding: 12px 0 !important;
            background: var(--btn) !important;
            color: #ffffff !important;
            text-decoration: none !important;
            border-radius: 8px !important;
            font-weight: bold !important;
            font-size: 14px !important;
            text-align: center !important;
            border:none;
            cursor:pointer;
        }
        .tip {
            margin-top: 8px !important;
            font-size: 13px !important;
            font-weight: 500 !important;
            transition: all 0.3s ease !important;
        }
        .tip-normal { color:var(--btn); }
        .tip-success { color:#059669; }
        .tip-fail { color:var(--fail); }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">⚡</div>
        <h2>⚡ 资源解析成功</h2>

        <div class="file-info">
            <strong>文件名：</strong><br>${fileName}
        </div>
        <div class="hash-info" id="hashContainer">
            <strong>BT‑HASH：</strong><span id="hashText">${hash}</span>
        </div>

        <p style="font-size:12px; color:var(--text-sub); margin-bottom:4px; text-align:left;"><b>磁力链接（点击框复制，长按选中）：</b></p>
        <div class="mag-box" id="magText" onclick="copyMagnet()">${magnet}</div>

        <div class="btn-row">
            <a href="${magnet}" class="btn" onclick="copyMagnet()">🚀 调用下载器</a>
            <button class="btn" onclick="copyMagnet()">📋 复制磁力链接</button>
        </div>

        <p id="tip" class="tip tip-normal">⏳ 尝试自动复制磁力链接...</p>
    </div>

    <script>
        const magnetStr = "${magnet}";
        const tipDom = document.getElementById('tip');

        function setTip(text, cls) {
            tipDom.innerText = text;
            tipDom.className = "tip " + cls;
        }

        //复制完整磁力链接（带 magnet:?xt=urn:btih: 前缀）
        function copyMagnet() {
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(magnetStr).then(()=>{
                    setTip("📋 磁力链接已复制剪贴板！","tip-success");
                }).catch(fallbackCopy);
            } else {
                fallbackCopy();
            }
        }

        function fallbackCopy(){
            try {
                const ta = document.createElement('textarea');
                ta.value = magnetStr;
                ta.style.position='fixed';ta.style.opacity='0';
                document.body.appendChild(ta);
                ta.focus();ta.select();
                const ok = document.execCommand('copy');
                document.body.removeChild(ta);
                if(ok) setTip("📋 磁力链接已复制剪贴板！","tip-success");
                else setTip("⚠️自动复制失败，请手动框选复制磁力","tip-fail");
            }catch(e){
                setTip("⚠️自动复制失败，请手动框选复制磁力","tip-fail");
            }
        }

        //多重触发自动复制，兼容各类webview
        function triggerAutoCopy(){
            setTimeout(copyMagnet, 200);
        }
        if(document.readyState === "loading"){
            document.addEventListener('DOMContentLoaded', triggerAutoCopy);
        }else{
            triggerAutoCopy();
        }
        window.addEventListener('load', triggerAutoCopy);
    </script>
</body>
</html>`;

    body = cleanHTML;
    $done({ body });

} catch (err) {
    console.log("rewrite error:" + String(err));
    $done({ body: $response.body });
}
