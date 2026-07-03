let body = $response.body;

// 1. 【泛化拦截】直接正则抹除所有类似 rm.1.0xx.js 的脚本和广告变量
body = body.replace(/<script src="[^"]*rm\.\d+\.\d+\.js"><\/script>/gi, "");
body = body.replace(/var (rmJson|poJson)\s*=\s*'\[.*?\]';/gi, "var $1 = '[]';");

// 2. 【直接在服务端抓取原响应里的 Hash，不依赖 DOM 构建】
// 磁力 Hash 本质是 40 位十六进制字符，我们直接对整个 Body 进行正则扫描
let hashMatch = body.match(/([a-fA-F0-9]{40})/);
let hash = hashMatch ? hashMatch[1] : null;

// 提取文件名（如果找不到则展示默认标题）
let nameMatch = body.match(/"n"\s*:\s*"([^"]+)"/);
let fileName = nameMatch ? nameMatch[1] : "未知资源文件";

if (hash) {
    let magnet = "magnet:?xt=urn:btih:" + hash;

    // 3. 【暴力替换 HTML】既然我们直接在响应体里拿到了最终结果，
    // 甚至不需要让浏览器去渲染原网页了！直接把整个 Body 替换成我们的卡片！
    let cleanPage = `
    <body style="margin:0;padding:0;background:#f0f2f5;display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">
        <div style="width:90%;max-width:500px;background:#fff;padding:25px;border-radius:16px;box-shadow:0 10px 25px rgba(0,0,0,0.08);text-align:center;">
            <div style="width:50px;height:50px;background:#e8f5e9;color:#2e7d32;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;margin:0 auto 15px;">⚡</div>
            <h2 style="margin:0 0 10px;font-size:18px;color:#1a1a1a;">资源解析成功</h2>
            <div style="background:#f8f9fa;padding:12px;border-radius:8px;margin-bottom:20px;font-size:14px;color:#495057;word-break:break-all;">
                <b>文件名：</b>${fileName}
            </div>
            <input id="magInput" type="text" value="${magnet}" readonly onclick="this.select()" 
                style="width:100%;box-sizing:border-box;padding:12px;font-size:13px;border:1.5px solid #4caf50;border-radius:8px;text-align:center;color:#2e7d32;background:#f4fbf5;margin-bottom:15px;outline:none;">
            <a href="${magnet}" style="display:block;width:100%;padding:12px 0;background:#10b981;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 4px 12px rgba(16,185,129,0.3);">
                🚀 立即调用下载器打开
            </a>
            <p id="tip" style="margin:12px 0 0;font-size:12px;color:#6b7280;">已为您屏蔽所有相关博彩追踪脚本</p>
        </div>
        <script>
            // 页面加载瞬间自动尝试复制到系统剪贴板
            setTimeout(() => {
                let input = document.getElementById('magInput');
                input.select();
                document.execCommand('copy');
                document.getElementById('tip').innerHTML = "✅ 磁力链接已自动复制到系统剪贴板！";
                document.getElementById('tip').style.color = "#10b981";
            }, 300);
        </script>
    </body>
    `;

    // 直接用干净的 body 替换掉原网页那几百行垃圾 HTML
    body = body.replace(/<body[^>]*>[\s\S]*<\/body>/i, cleanPage);
}

$done({ body });
