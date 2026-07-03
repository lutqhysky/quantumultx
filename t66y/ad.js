let body = $response.body;

// 1. 定义一个强力注入脚本：直接在页面顶部生成一个显眼的磁力链接区域
let inject = `
<script>
document.addEventListener("DOMContentLoaded", function(){
    // 检查页面里是否存在包含 hash 的全局变量
    if (typeof json !== "undefined" && json.ref || (document.getElementById('ref'))) {
        let hash = (typeof json !== "undefined" && json.ref) ? json.ref : document.getElementById('ref').value;
        
        // 有些网页的 ref 变量前两位可能是固定混淆字符（比如 26），真正的 hash 是后 40 位
        if (hash.length > 40) {
            hash = hash.slice(-40);
        }
        
        let magnet = "magnet:?xt=urn:btih:" + hash;

        // 创建一个悬浮在最顶部的浮层，方便复制
        let div = document.createElement('div');
        div.style.cssText = "position:fixed;top:0;left:0;width:100%;background:#d4edda;color:#155724;padding:15px;z-index:99999;text-align:center;font-size:16px;box-shadow:0 2px 5px rgba(0,0,0,0.2);word-break:break-all;box-sizing:border-box;";
        div.innerHTML = "<b>🎉 脚本已成功拦截磁力链：</b><br><input type='text' value='" + magnet + "' style='width:90%;max-width:600px;margin-top:10px;padding:5px;text-align:center;' readonly onclick='this.select()'><br><small style='color:#666;'>点击输入框即可全选复制</small>";
        
        document.body.insertBefore(div, document.body.firstChild);
    }
});
</script>
`;

// 2. 注入到 </body> 之前
body = body.replace("</body>", inject + "</body>");

$done({ body });
