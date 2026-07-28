let body = $response.body;

// 0. 防重检测：若已解析过则直接返回
if (body.indexOf('id="magInput"') !== -1 || body.indexOf('⚡') !== -1) {
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

    // 强制构建完整的 HTML 结构，包括 HEAD 中的强行 CSS 重置
    let cleanHTML = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>资源解析成功 - ${fileName}</title>
    <style>
        * { box-sizing: border-box !important; margin: 0; padding: 0; }
        html, body { height: 100% !important; width: 100% !important; background-color: #f0f2f5 !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important; }
        .wrapper { display: flex !important; justify-content: center !important; align-items: center !important; min-height: 100vh !important; padding: 20px !important; }
        .card { width: 100% !important; max-width: 480px !important; background: #ffffff !important; padding: 25px !important; border-radius: 16px !important; box-shadow: 0 10px 25px rgba(0,0,0,0.08) !important; text-align: center !important; }
        .icon { width: 50px !important; height: 50px !important; background: #e8f5e9 !important; color: #2e7d32 !important; border-radius: 50% !important; display: flex !important; align-items: center !important; justify-content: center !important; font-size: 24px !important; margin: 0 auto 15px !important; }
        .title { font-size: 18px !important; color: #1a1a1a !important; font-weight: 600 !important; margin-bottom: 15px !important; }
        .file-box { background: #f8f9fa !important; padding: 12px !important; border-radius: 8px !important; margin-bottom: 15px !important; font-size: 14px !important; color: #495057 !important; word-break: break-all !important; text-align: left !important; }
        .mag-input { width: 100% !important; padding: 12px !important; font-size: 12px !important; border: 1.5px solid #4caf50 !important; border-radius: 8px !important; text-align: center !important; color: #2e7d32 !important; background: #f4fbf5 !important; margin-bottom: 15px !important; outline: none !important; display: block !important; }
        .btn { display: block !important; width: 100% !important; padding: 12px 0 !important; background: #10b981 !important; color: #ffffff !important; text-decoration: none !important; border-radius: 8px !important; font-weight: 600 !important; font-size: 15px !important; box-shadow: 0 4px 12px rgba(16,185,129,0.3) !important; border: none !important; }
        .tip { margin-top: 15px !important; font-size: 12px !important; color: #6b7280 !important; }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="card">
            <div class="icon">⚡</div>
            <div class="title">资源解析成功</div>
            <div class="file-box"><b>文件名：</b>${fileName}</div>
            <input id="magInput" class="mag-input" type="text" value="${magnet}" readonly onclick="this.select()">
            <a href="${magnet}" class="btn">🚀 立即调用下载器打开</a>
            <p id="tip" class="tip">已为您屏蔽所有相关博彩追踪脚本</p>
        </div>
    </div>
    <script>
        setTimeout(() => {
            let input = document.getElementById('magInput');
            if (input) {
                input.select();
                try {
                    document.execCommand('copy');
                    let tip = document.getElementById('tip');
                    if (tip) {
                        tip.innerHTML = "✅ 磁力链接已自动复制到系统剪贴板！";
                        tip.style.color = "#10b981";
                    }
                } catch(e){}
            }
        }, 300);
    </script>
</body>
</html>`;

    // 直接暴力覆盖整页 HTML（不再仅仅替换 <body>），彻底切断外部 CSS 干扰
    body = cleanHTML;
}

$done({ body });
