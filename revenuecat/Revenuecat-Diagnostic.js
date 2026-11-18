/*
 * ============================================
 * Revenuecat-Diagnostic.js
 *
 * Version: 1.0.1
 * Platform: Surge iOS
 * Type: http-response
 *
 * 功能：
 * 1. 读取 HTTP 响应状态
 * 2. 检查响应体是否存在
 * 3. 检查 JSON 是否能够正常解析
 * 4. 记录 JSON 顶层字段名称
 * 5. 记录 Surge 运行环境
 *
 * 安全原则：
 * 不修改响应状态、响应头或响应体。
 * 不读取或输出账号、Token、订阅权益具体内容。
 * 不发起额外网络请求。
 * ============================================
 */
/* ---------- 1. 基础设置 ---------- */
var SCRIPT_NAME = "Revenuecat-Diagnostic";
var VERSION = "1.0.1";
var DEBUG = true;
/* ---------- 2. 日志函数 ---------- */
function log(message) {
    if (!DEBUG) {
        return;
    }
    try {
        console.log(
            "[" + SCRIPT_NAME + "] " + message
        );
    } catch (e) {
        // 日志失败不影响请求
    }
}
/* ---------- 3. 安全读取 ---------- */
function safeRead(callback, fallback) {
    try {
        return callback();
    } catch (e) {
        return fallback;
    }
}
/* ---------- 4. Surge 环境信息 ---------- */
function inspectEnvironment() {
    return safeRead(function () {
        return {
            system: $environment.system || "未知",
            surgeVersion:
                $environment["surge-version"] || "未知",
            surgeBuild:
                $environment["surge-build"] || "未知"
        };
    }, {
        system: "不可读取",
        surgeVersion: "不可读取",
        surgeBuild: "不可读取"
    });
}
/* ---------- 5. HTTP 状态检测 ---------- */
function inspectStatus() {
    return safeRead(function () {
        if (
            typeof $response === "undefined" ||
            !$response
        ) {
            return "响应对象不存在";
        }
        return (
            typeof $response.status === "number"
                ? $response.status
                : "状态码不可读取"
        );
    }, "状态读取失败");
}
/* ---------- 6. JSON 结构检测 ---------- */
function inspectBody() {
    var result = {
        exists: false,
        type: "未知",
        length: 0,
        validJSON: false,
        rootType: "未知",
        rootKeys: []
    };
    try {
        if (
            typeof $response === "undefined" ||
            !$response
        ) {
            return result;
        }
        var body = $response.body;
        if (typeof body !== "string") {
            result.type = typeof body;
            return result;
        }
        result.exists = true;
        result.type = "string";
        result.length = body.length;
        if (body.length === 0) {
            return result;
        }
        var data;
        try {
            data = JSON.parse(body);
        } catch (parseError) {
            result.rootType = "JSON解析失败";
            return result;
        }
        result.validJSON = true;
        if (data === null) {
            result.rootType = "null";
        } else if (Array.isArray(data)) {
            result.rootType = "array";
        } else {
            result.rootType = typeof data;
        }
        // 只记录顶层字段名称，不记录字段值
        if (
            data !== null &&
            typeof data === "object" &&
            !Array.isArray(data)
        ) {
            result.rootKeys = Object.keys(data);
        }
    } catch (e) {
        result.rootType = "检测异常";
    }
    return result;
}
/* ---------- 7. 主程序 ---------- */
function main() {
    var startTime = Date.now();
    log("================================");
    log("脚本启动");
    log("版本：" + VERSION);
    // Surge 版本信息
    var environment = inspectEnvironment();
    log(
        "运行环境：" +
        JSON.stringify(environment)
    );
    // HTTP 状态
    var status = inspectStatus();
    log(
        "HTTP 状态：" + status
    );
    // 响应体结构
    var bodyInfo = inspectBody();
    log(
        "响应体存在：" + bodyInfo.exists
    );
    log(
        "响应体类型：" + bodyInfo.type
    );
    log(
        "响应体长度：" + bodyInfo.length
    );
    log(
        "JSON 是否有效：" + bodyInfo.validJSON
    );
    log(
        "JSON 根节点类型：" + bodyInfo.rootType
    );
    log(
        "JSON 顶层字段：" +
        JSON.stringify(bodyInfo.rootKeys)
    );
    log(
        "诊断耗时：" +
        (Date.now() - startTime) +
        " ms"
    );
    log("诊断结束");
    log("================================");
}
/* ---------- 8. 执行与放行 ---------- */
try {
    main();
} catch (e) {
    log("主程序异常：" + String(e));
} finally {
    // Surge 官方原样放行方式
    // 不传入 body、headers、status
    $done({});
}
