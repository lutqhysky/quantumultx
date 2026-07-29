/*
 * Surge HTTP Response Script
 * 作用：将 t66y 的外链 embed 页面直接重写为原生的 HTML5 视频播放器
 */
let body = $response.body;

if (body && body.includes("kt_player")) {
    // 通过正则从网页源码中把真实视频地址提取出来
    let match = body.match(/video_url:\s*'([^']+)'/);
    if (match && match[1]) {
        let videoUrl = match[1];
        
        // 构造一个好看且满血支持手机端播放的标准 HTML 页面替换掉原版
        body = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { margin: 0; background: #000; display: flex; justify-content: center; align-items: center; height: 100vh; }
                video { width: 100%; height: 100%; max-height: 100vh; object-fit: contain; }
            </style>
        </head>
        <body>
            <video src="${videoUrl}" controls autoplay playsinline webkit-playsinline></video>
        </body>
        </html>`;
    }
}

$done({ body });
