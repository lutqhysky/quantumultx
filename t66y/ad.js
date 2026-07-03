let body = $response.body;

// 1. 【斩草除根】直接删除原网页负责渲染博彩广告和检测屏蔽的远程 JS 脚本
body = body.replace(/<script src="[^"]*rm\.1\.023\.js"><\/script>/gi, "");

// 2. 【清空广告数据】把隐藏在页面的 12 条博彩跳转数据直接清空
body = body.replace(/var rmJson = '\[.*?\]';/g, "var rmJson = '[]';");
body = body.replace(/var poJson = '\[.*?\]';/g, "var poJson = '[]';");

// 3. 【注入界面】只保留最核心的磁力链接提取和清爽 UI
let inject = `
<style>
/* 屏蔽底部的反屏蔽提示文字和所有残留图片 */
#foo1ter, img { display: none !important; }
</style>
<script>
document.addEventListener("DOMContentLoaded", function(){
    // 提取特征码
    let hash = "";
    if (typeof json !== "undefined" && json.ref) {
        hash = json.ref;
    } else if (document.getElementById('ref')) {
        hash = document.getElementById('ref').value;
    }
    
    // 如果提取到的特征码长度大于40（前两位通常是26等混淆码），截取最后40位纯Hash
    if (hash && hash.length > 40) {
        hash = hash.slice(-40);
    }

    // 提取文件名
    let fileName = (typeof json !== "undefined" && json.n) ? json.n : "未知文件";

    if (hash) {
        let magnet = "magnet:?xt=urn:btih:" + hash;

        // 构建一个极简、干净的下载控制台，覆盖掉中间区域
        let cleanBox = document.createElement('div');
        cleanBox.style.cssText = "max-width: 600px; margin: 30px auto; padding: 20px; background: #f8f9fa; border: 2px solid #28a745; border-radius: 10px; text-align: center; font-family: sans-serif; box-shadow: 0 4px 10px rgba(0,0,0,0.1);";
        cleanBox.innerHTML = \`
            <h3 style="color:#28a745; margin-top:0;">⚡ 磁力链接提取成功</h3>
            <p style="color:#333; font-size:14px; word-break:break-all;"><b>文件名：</b>\${fileName}</p>
            <input type="text" value="\${magnet}" style="width:95%; padding:10px; font-size:14px; border:1px solid #ccc; border-radius:5px; text-align:center; color:#333; background:#fff;" readonly onclick="this.select()">
            <p style="color:#666; font-size:12px; margin-bottom:0;">👆 点击上方框内链接即可一键全选复制</p>
        \`;

        // 查找原本存放表格的 list 区域并替换内容
        let listEl = document.querySelector(".list");
        if (listEl) {
            listEl.innerHTML = "";
            listEl.appendChild(cleanBox);
            listEl.style.display = "block";
        } else {
            document.body.insertBefore(cleanBox, document.body.firstChild);
        }
    }
});
</script>
`;

// 把处理完的清爽样式和提取脚本插到页面底部
body = body.replace("</body>", inject + "</body>");

$done({ body });
