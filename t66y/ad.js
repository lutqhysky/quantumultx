let body = $response.body;

// 0. 防重检测：若已解析过则直接返回
if (body.indexOf('magnet:?xt=urn:btih:') !== -1 && body.indexOf('资源解析成功') !== -1) {
    $done({ body });
}

// 1. 拦截垃圾脚本与变量
body = body.replace(/<script src="[^"]*rm\.\d+\.\d+\.js"><\/script>/gi, "");
body = body.replace(/var (rmJson|poJson)\s*=\s*'\[.*?\]';/gi, "var $1 = '[]';");

// 2. 提取文件名和 Hash
let nameMatch = body.match(/"n"\s*:\s*"([^"]+)"/i) || body.match(/<title>(.*?)<\/title>/i);
let fileName = (nameMatch && nameMatch[1]) ? nameMatch[1].trim() : "未知资源文件";

let hashMatch = body.match(/([a-fA-F0-9]{40})/);
let hash = hashMatch ? hashMatch[1] : null;

if (hash) {
    let magnet = "magnet:?xt=urn:btih:" + hash;

    // 兼顾 Safari 完美 UI 与 SmartRSS 阅读模式降级兼容的 HTML 结构
    let cleanHTML = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>${fileName}</title>
    <style>
        * { box-sizing: border-box !important; }
        body { margin: 0 !important; padding: 20px !important; background: #f0f2f5 !important; font-family: -apple-system, BlinkMacSystemFont, sans-serif !important; display: flex !important; justify-content: center !important; align-items: center !important; min-height: 100vh !important; }
        .card { width: 100% !important; max-width: 480px !important; background: #ffffff !important; padding: 25px !important; border-radius: 16px !important; box-shadow: 0 10px 25px rgba(0,0,0,0.08) !important; text-align: center !important; }
        .icon { font-size: 36px !important; margin-bottom: 10px !important; }
        h2 { font-size: 18px !important; color: #1a1a1a !important; margin: 10px 0 !important; }
        .file-info { background: #f8f9fa !important; padding: 12px !important; border-radius: 8px !important; margin: 15px 0 !important; font-size: 14px !important; color: #333 !important; word-break: break-all !important; text-align: left !important; }
        .mag-box { background: #f4fbf5 !important; border: 1.5px solid #4caf50 !important; padding: 10px !important; border-radius: 8px !important; font-size: 12px !important; color: #2e7d32 !important; word-break: break-all !important; margin-bottom: 15px !important; font-family: monospace !important; }
        .btn { display: block !important; width: 100% !important; padding: 12px 0 !important; background: #10b981 !important; color: #ffffff !important; text-decoration: none !important; border-radius: 8px !important; font-weight: bold !important; font-size: 15px !important; text-align: center !important; }
        .tip { margin-top: 12px !important; font-size: 12px !important; color: #10b981 !important; }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">⚡</div>
        <h2>⚡ 资源解析成功</h2>
        
        <div class="file-info">
            <strong>文件名：</strong><br>${fileName}
        </div>

        <!-- 针对阅读模式：即使输入框被干掉，明文文本段落也能完好保留 -->
        <p style="font-size:12px; color:#666; margin-bottom:4px; text-align:left;"><b>磁力链接：</b></p>
        <div class="mag-box" id="magText">${magnet}</div>

        <p><a href="${magnet}" class="btn">🚀 立即调用下载器打开</a></p>
        
        <p id="tip" class="tip">✅ 已为您自动提取磁力链接并屏蔽追踪脚本</p>
    </div>
</body>
</html>`;

    body = cleanHTML;
}

$done({ body });
