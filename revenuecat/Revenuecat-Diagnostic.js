/*
 * ============================================
 * Revenuecat-Diagnostic.js
 *
 * 版本：1.0.0
 * 用途：RevenueCat 响应只读诊断
 *
 * 设计原则：
 * 1. 只读取响应，不修改响应内容
 * 2. 不创建、不修改订阅权益
 * 3. 不发起额外网络请求
 * 4. 不记录账号、Token、完整响应内容
 * 5. 诊断失败不能影响原始请求
 *
 * 目标客户端：
 * Quantumult X / Surge
 *
 * 注意：尚未经过真实设备实测。
 * ============================================
 */
/* ---------- 1. 基础配置 ---------- */
// 是否开启控制台日志
var DEBUG = true;
// 脚本名称
var SCRIPT_NAME = "Revenuecat-Diagnostic";
// 版本号
var VERSION = "1.0.0";
/* ---------- 2. 防止重复结束 ---------- */
var isDone = false;
function finish() {
    if (isDone) {
        return;
    }
    isDone = true;
    // 空对象表示不主动修改响应
    $done({});
}
/* ---------- 3. 日志管理 ---------- */
function log(message) {
    if (!DEBUG) {
        return;
    }
    try {
        console.log(
            "[" + SCRIPT_NAME + "] " + message
        );
    } catch (e) {
        // 日志失败不影响主流程
    }
}
/* ---------- 4. 运行环境检测 ---------- */
function detectEnvironment() {
    var result = {
        taskFetch: false,
        httpClient: false,
        persistentStore: false,
        prefs: false,
        notification: false,
        notify: false
    };
    try {
        result.taskFetch =
            typeof $task !== "undefined" &&
            typeof $task.fetch === "function";
    } catch (e) {}
    try {
        result.httpClient =
            typeof $httpClient !== "undefined" &&
            typeof $httpClient.get === "function";
    } catch (e) {}
    try {
        result.persistentStore =
            typeof $persistentStore !== "undefined" &&
            typeof $persistentStore.read === "function";
    } catch (e) {}
    try {
        result.prefs =
            typeof $prefs !== "undefined" &&
            typeof $prefs.valueForKey === "function";
    } catch (e) {}
    try {
        result.notification =
            typeof $notification !== "undefined" &&
            typeof $notification.post === "function";
    } catch (e) {}
    try {
        result.notify =
            typeof $notify === "function";
    } catch (e) {}
    return result;
}
/* ---------- 5. 响应状态检测 ---------- */
function getStatusCode() {
    try {
        if (
            typeof $response !== "undefined" &&
            $response
        ) {
            return (
                $response.statusCode ||
                $response.status ||
                "未知"
            );
        }
    } catch (e) {}
    return "不可读取";
}
/* ---------- 6. 响应内容检测 ---------- */
function inspectResponse() {
    var result = {
        exists: false,
        isJSON: false,
        length: 0,
        rootKeys: [],
        hasSubscriber: false
    };
    try {
        if (
            typeof $response === "undefined" ||
            !$response
        ) {
            return result;
        }
        if (
            typeof $response.body !== "string"
        ) {
            return result;
        }
        var body = $response.body;
        result.exists = true;
        result.length = body.length;
        if (!body) {
            return result;
        }
        var data;
        try {
            data = JSON.parse(body);
        } catch (parseError) {
            return result;
        }
        result.isJSON = true;
        // 只记录顶层字段名称
        if (
            data &&
            typeof data === "object" &&
            !Array.isArray(data)
        ) {
            result.rootKeys = Object.keys(data);
            // 仅判断 subscriber 是否存在
            // 不读取其内部账号或订阅信息
            result.hasSubscriber =
                Object.prototype.hasOwnProperty.call(
                    data,
                    "subscriber"
                );
        }
    } catch (e) {
        // 诊断异常不影响原始响应
    }
    return result;
}
/* ---------- 7. 主程序 ---------- */
function main() {
    try {
        log("--------------------------------");
        log(
            "启动诊断，版本：" + VERSION
        );
        // 检测当前客户端提供的接口
        var env = detectEnvironment();
        log(
            "接口能力：" +
            JSON.stringify(env)
        );
        // 获取 HTTP 状态码
        var status = getStatusCode();
        log(
            "HTTP 状态：" + status
        );
        // 检查响应结构
        var info = inspectResponse();
        log(
            "响应是否存在：" + info.exists
        );
        log(
            "响应长度：" + info.length
        );
        log(
            "JSON 格式：" + info.isJSON
        );
        log(
            "顶层字段：" +
            JSON.stringify(info.rootKeys)
        );
        log(
            "是否存在 subscriber：" +
            info.hasSubscriber
        );
        log("诊断完成");
        log("--------------------------------");
    } catch (e) {
        log(
            "诊断发生异常：" +
            String(e)
        );
    } finally {
        // 无论诊断成功还是失败，
        // 都不主动修改原始响应
        finish();
    }
}
/* ---------- 8. 启动 ---------- */
main();
