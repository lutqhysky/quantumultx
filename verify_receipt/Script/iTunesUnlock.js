/*************************************
iTunes 收据解锁 · Surge 干净重写版

原理：拦截 buy.itunes.apple.com/verifyReceipt 的响应，
按 App 映射表伪造内购收据（订阅/买断），到期写到 2099-12-31。
App 名单与 product_id 取自 @ddm1023 的 iTunes.js（2026-10-02 版）
及网上同类脚本的通用写法，逻辑全部重写、可审计。

与原版的区别：
1. 无 jsjiami 混淆，无"删除版本号"弹窗 nag
2. 默认关闭"未命中名单时盲猜 ${bid}.yearly"（原版兜底会给任意
   走该接口的 App 注入假订阅；如需开启改 ENABLE_BLIND_FALLBACK）
3. 未命中名单但收据里已有过期订阅 → 只把到期时间延到 2099，
   不编造新商品；无任何购买记录 → 直接放行
4. 支持排除名单（已购 App 直接放行，不碰真实收据）

Surge 配置：
[Script]
iTunesUnlock = type=http-response,pattern=^https?:\/\/buy\.itunes\.apple\.com\/verifyReceipt$,requires-body=true,script-path=<你的脚本地址>,script-update-interval=0
[MITM]
hostname = %APPEND% buy.itunes.apple.com

注意：MITM buy.itunes.apple.com 可能影响 App Store 登录 Apple ID，
如遇登录问题，临时关闭该 hostname 的 MITM 或本脚本即可。
*************************************/

// ===== 可调配置 =====
// 已购 App 的 bundle_id（小写），精确匹配，命中直接放行不碰收据
const EXCLUDE_BUNDLE_IDS = [];
// 未命中名单时，是否盲猜 ${bundle_id}.yearly 并注入（默认关闭）
const ENABLE_BLIND_FALLBACK = false;
// 伪造的到期时间（与 RevenueCat 脚本统一为 2099-12-31）
const FAKE_EXPIRES = '2099-12-31T23:59:59Z';

// ===== App 映射表：[匹配关键字, 类型, product_id] =====
// 类型：sub=订阅（写 in_app + latest_receipt_info + pending_renewal_info）
//       life=买断（只写 in_app，不过期）
// 关键字匹配 UA 开头或收据 bundle_id 开头（归一化后比较，兼容 %20/空格/无分隔三种写法）
// product_id 来自原 iTunes.js 名单，未逐一核实，按需删减
const APP_LIST = [
["Water%20Reminder","sub","com.vgfit.premiumtracker.year"], // 水提醒
["MusicMix%20Pro","life","permanent"], // 音频剪辑
["StreamingLite","life","NSP.lifetime"], // Nero乐播投屏
["Anytable","life","100004"], // 多多记账
["bazaart","sub","Bazaart_Super_Three_Months_v4"], // Bazaart
["SHScan","sub","com.ws.SHScanFree.Year"], // 扫描王
["EnglishTalent","sub","com.mango.newYearVip"], // 英语演讲
["art.yueyin.ebook-convert","sub","art.yueyin.ebook.year"], // 电子书格式转换
["MaiqiSun","life","life_cn_68"], // iSunning
["PulseWatch","life","relaxlife_ebp"], // RelaxWatch压力监测
["PicCompress","sub","pc_vip_new_1y"], // 图片压缩
["XiangCePhoto","life","ql128"], // 相册清理
["FileMaster","life","FileMaster_ProVersion"], // 文件大师
["Tuesday","life","PIGLET_VIP_Forever"], // Tuesday纪念日
["IPTV%20Flixana","life","iptv_flixana_lifetime_sub"], // IPTV Flixana
["AdBlocker","life","com.va.adBlocker.lifeTimefree"], // AdBlocker
["ECGPlus","life","com.wms.hrv.pro"], // ECG心电分析
["WatchWallpaper","sub","indie.davidwang.WatchWallpaper.yearsubscriptegold"], // 表盘专辑
["com.beauty.MeiTui","sub","vip_member_v3_365day"], // AI美腿
["ChmReader","life","EpubReader_ProVersion"], // Epub阅读器
["MediaConvert","life","MediaConverter_ProVersion"], // 格式转换
["Period","life","com.hanchongzan.time.pro"], // 时光提醒
["com.sixiaobo.MusCut","life","com.purecollage.pro"], // 无损拼图
["com.hanchongzan.loverlist","life","com.hanchongzan.loverlist.01"], // 恋人清单
["FlashTransportMaster","sub","com.flashtransport.fightenegery.yearly.base"], // 时光罐罐
["com.ideack.ASR","life","ASR_Permanent_Plan"], // 录音转文字
["Presets","sub","com.chromatech.chroma.yearlyAutoRenewable"], // Presets修图
["GoodTask","life","com.hahainteractive.goodtask3.pro"], // GoodTask
["com.hanchongzan.period","life","com.hanchongzan.period.girl"], // 姨妈来咯
["com.hanchongzan.book","life","com.hanchongzan.book.vip"], // 闪电记账
["SoundLab","life","8001"], // 合声音乐制作
["ECGANALYZER","sub","com.wms.hrv.yearlyfamilysharing"], // ECG+
["com.RuoG.Pixiu","sub","com.RuoG.Pixiu.VIPYear"], // 貔貅记账
["com.ideack.BusinessCard","life","BusinessCardVipPerpetual"], // 名片夹
["com.ideack.MagicAudio","life","MagicAudioPermanent"], // 音乐剪辑
["DuChuangZhe","sub","org.zrey.du.main"], // 独创者
["PhotoWhite","life","org.zrey.photowhite.flash_lifetime"], // 印白相册
["Pure%20Tuber%20Pro","life","lifetime"], // PureTuberPro
["FETreeVideoChange","life","com.dj.videototext.forever"], // 视频转文字
["%E5%B0%8F%E5%B0%8F%E7%9B%B8%E6%9C%BA%E5%A4%A7%E5%B8%88","life","com.ai.merge.forever.vip"], // 乐颜
["FoodIdentificationTool","life","20002"], // 剂查查
["com.qingcheng.seal.Seal","life","com.qingcheng.seal.Seal.premium.forever"], // 印章制作
["com.geekapp.VoiceTranslation","life","VoiceTranslatorPerpetual"], // 出国翻译官
["com.idealityapp.VideoEditing","life","MagicVideo_Vip_Permanent"], // 魔影视频剪辑
["YinzhangMaster","life","com.xiaoqi.seal.forever"], // 印章大师
["com.cuilingshi.flipclock","life","FlipClockProVersion"], // 翻页时钟
["com.maine.aifill","life","com.maine.aifill.unlimited"], // AI FILL
["Graphionica","sub","premium_year"], // Graphionica
["AIAssistant","sub","AIchat_1w_7.99_trial"], // AIAssistant
["MonitorPlus","life","com.unhonin.MonitorPlus.proversion"], // Monitor+
["MessageHold","sub","com.messagehold.forever"], // 拦截盾
["Guitar%20Gravitas","sub","GuitarGravitasChordsScalesArpeggiosLessons"], // GuitarGravitas
["com.casttv.remotetv","life","liftetime2"], // TV遥控器
["WallpaperWidget","sub","com.widget.theme.yearly.3dayfree"], // 壁纸主题
["ProREC","sub","ProAudioCamera_Annual"], // ProREC相机
["TypeOn%20Keyboard","life","com.hanchongzan.book.vip"], // TypeOn键盘
["PhotoCollagePro","life","PHOTABLE_PREMIUM"], // Photable
["com.alphamobiletech.bodyApp","life","Bodyapp_Forever"], // Bodyapp
["com.alphamobiletech.facey","life","Facey_Forever"], // Facey
["Packet","life","com.aaaalab.nepacket.iap.full"], // HTTPS抓包
["AllMyBatteries","life","AllMyBatteries_Ultimate"], // 电池管家
["VDIT","life","me.imgbase.videoday.profeaturesLifetime"], // VDIT视频转换
["CodeSnippet","sub","it.beatcode.codesnippetpro.annualSubscription"], // CodeSnippet
["darkWeb","sub","dforce_unlock_all_functions"], // DForce
["BookReader","sub","com.reader.1year"], // 小说阅读器
["BeatStation","sub","BS_Pro_Yearly"], // BeatStation
["FastPlayer","sub","VideoPlayer_ProVersion"], // 万能播放器
["SimpleNotation","life","com.xinlin.notation.once"], // 简谱大师
["ChordMaster","life","com.chordMaster.once"], // 识谱大师
["Xfuse","life","com.xfuse.ProVision"], // 磁力宅播放器
["com.BertonYc.ScannerOCR","life","Scanner_Subscibe_Permanent"], // 万能扫描王
["HRV","sub","com.stress.test.record.yearly"], // 解压小橘子（原版缺tp，按年订阅处理）
["iVCam","life","ivcam.full"], // iVCam电脑摄像头
["RBrowser","sub","com.mm.RBroswer.product11"], // R浏览器
["Filterra","life","com.filterra.wtonetimepurchase"], // Filterra
["MOLDIV","life","com.jellybus.Moldiv.IAP.PRO7999"], // MOLDIV
["PICSPLAY","sub","com.jellybus.PicsPlay2.IAP.PRO5999"], // PICSPLAY
["Rookie","sub","com.jellybus.Rookie.IAP.PRO5999"], // RKCAM
["MoneyWiz","sub","com.moneywiz.personalfinance.1year"], // MoneyWiz
["qxzs","life","yongjiu"], // 心率广播
["Overdrop","life","com.weather.overdrop.forever"], // Overdrop天气
["Boom","life","com.globaldelight.iBoom.LifetimeDiscountPack"], // Boom
["PDFReaderPro%20Free","life","com.pdfreaderpro.free.member.all_access_pack_permanent_license.001"], // PDFReaderPro
["VideoHelper","life","vip_service"], // 媒关系
["Digital%20Planner","sub","com.softwings.DigitalPlanner.1year"], // 电子手帐
["SuperMandarin","sub","pth_vip_year"], // 普通话测试
["SuperQuestion","sub","qtzs_vip_year"], // 真题全刷
["SuperElves","life","com.SuperElves.Answer.Forever"], // 答案精灵
["SuperDriving","life","jiakao_vip_forever"], // 驾考学典
["Pollykann","life","vip.forever.pollykann"], // 小鹦看看
["JCCalendar","life","com.sjc.calendar.vip.lifelong"], // 简约日历
["com.yanxia.ChsMedical","life","VIPUser"], // 中医精华
["SuperPointer","life","com.SuperPointer.Location.Forever"], // 海拔指南针
["SnakeReader","sub","com.lyran.snakescanner.premium18"], // 开卷阅读
["FourthPPT","life","com.FourthPPT.Mobile.Forever"], // PPT制作
["OneExtractor","life","com.OneExtractor.Video.Forever"], // 视频提取器
["com.Colin.Colors","sub","com.colin.colors.annualVIP"], // 搜图
["PhotosSorter","life","sorter.pro.ipa"], // Sorter相册整理
["intolive","sub","me.imgbase.intolive.proSubYearly"], // intolive实况壁纸
["MyAlbum","life","com.colin.myalbum.isUpgradeVip"], // Cleaner照片管理
["VideoEditor","life","com.god.videohand.alwaysowner"], // VideoShot
["ShotOn","life","com.colin.shoton.forevervip"], // ShotOn
["TimeCut","sub","com.floatcamellia.hfrslowmotion.forevervip"], // TimeCut
["com.floatcamellia.motiok","sub","com.floatcamellia.motiok.vipforever"], // Hype_Text
["GreetingScanner","sub","com.alphaplus.greetingscaner.w.b"], // 扫描识别王
["FancyCamPlus","sub","com.alphaplus.fancycam.year.198"], // 悦颜相机
["Again","life","com.owen.again.profession"], // Again稍后读
["com.damon.dubbing","sub","com.damon.dubbing.vip12"], // 有声英语绘本
["ZHUBEN","sub","com.xiaoyu.yue"], // 有声英语绘本
["XIAOTangHomeParadise","sub","com.yuee.mo2"], // 鸿海幼儿启蒙
["film","sub","pro_auto_subscribe_year_ovs"], // 胶卷相机
["Muza","sub","com.appmuza.premium_year"], // Muza修图
["StandbyWidget","sub","com.standby.idream.year.68"], // StandBy情侣定位（订阅部分）
["StandbyWidget","life","standbyus.nonconsume.missingyou"], // StandBy情侣定位（买断部分）
["Mango6Minute","sub","576170870"], // 6分钟英语
["Photo%20Cutout","sub","com.icepine.allyear"], // 轻松扣图
["WasteCat","life","dev.sanjin.WasteCat.PermanentVip"], // 垃圾贪吃猫
["MeowTalk","sub","meowtalk.month.basic.autorenewable.subscription"], // 喵说
["habitdot","life","habitdots_pro_forever"], // 习惯点点
["stretchworkout","sub","com.abishkking.premiumYearStretch"], // 拉伸运动
["com.uzstudio.avenuecast.ios","life","1001"], // 凡视知音
["CongZhenBaZi","life","vip_forever_78"], // 八字排盘
["CongZhenQiMen","sub","cn.congzhen.CongZhenQiMen.yearlyplan"], // 奇门遁甲
["ProFit","sub","com.maxty.gofitness.yearlyplan"], // ProFit锻炼
["GPSMaker","sub","theodolite_vip_year"], // 指南针定位
["Smoke","sub","smoke19870727"], // 今日香烟
["AppAlarmIOS","sub","alarm.me.vip.year.tier1"], // Me+
["Tinglee","sub","vip.forever.tinglee"], // 英语听听
["NoteKeys","sub","notekeys_access_weekly"], // 五线谱
["SheetMusicPro","sub","sheetmusicpro.yearwithtrial"], // 乐谱吧
["ProtractorEdge","sub","ProtracatorEdge.PremiumAccess"], // 量角器
["Piano%20Plus","sub","kn_access_weekly"], // Piano Plus
["Notation%20Pad","sub","np_access_weekly"], // Notation Pad
["Guitar%20Notation","sub","gn_access_weekly"], // Guitar Notation
["Piano%20Fantasy","sub","com.lotuz.PianoFantasy.weekwithtrail"], // 钢琴幻想
["Piano%20Rush","sub","com.lotuz.PianoPro.weekwithtrail"], // 钢琴大师
["com.richads.saucyart","sub","com.richads.saucyart.sub.quarterly_29.99"], // Perky
["SurveyorPro","sub","com.celiangyuan.SurveyorPro.OneYear"], // 测量员Pro
["com.ydatong.dingdone","life","com.ydatong.dingdone.vip.forever"], // 叮当代办
["Dial","sub","2104"], // T9拨号
["qxwp%20copy","sub","com.chowjoe.wp2free.year.pro"], // 壁纸（订阅部分）
["qxwp%20copy","sub","com.chowjoe.wp2free.coin.70"], // 壁纸（coin部分）
["LingLongShouZ","sub","zhenwushouzhangQuarterlyPlus"], // Cute手帐
["MediaEditor","life","alwaysowner"], // 剪影
["com.gostraight.smallAccountBook","life","ForeverVIPPayment"], // iCost记账
["ZJTBiaoGe","sub","zhangjt.biaoge.monthvip"], // 表格手机版
["MiniMouse","sub","minimouse_vip_1year"], // MiniMouse
["Paste%20Keyboard","sub","com.keyboard.1yetr"], // 复制粘贴键盘
["EWA","sub","com.ewa.renewable.subscription.year8"], // EWA学外语
["BuBuSZ","life","quaVersion"], // BuBu手帐
["com.icandiapps.nightsky","sub","com.icandiapps.ns4.annual"], // 星空
["Wallpapers","sub","wallpaperworld.subscription.yearly.12.notrial"], // Wallpaper Tree
["com.yumiteam.Kuki.ID","sub","com.yumiteam.Kuki.ID.2"], // PicsLeap美飞
["com.quangtm193.picpro","sub","com.quangtm193.picpro1year"], // PicPro
["Storybeat","sub","yearly_1"], // Storybeat
["SmartGym","sub","com.smartgymapp.smartgym.premiumuserworkoutsyearly"], // SmartGym
["Prookie","sub","prookie.month.withtrial.0615"], // AI灵绘
["BodyTune","sub","Bodypro1"], // BodyTune瘦身相机
["killer.sudoku.free.brain.puzzle","sub","ks.i.iap.premium"], // 杀手数独
["sudoku.puzzle.free.game.brain","sub","sudoku.i.sub.vvip.p1y"], // 数独
["One%20Markdown","life","10012"], // One Markdown
["MWeb%20iOS","life","10001"], // MWeb
["NYMF","sub","net.nymf.app.premium_year"], // Nymf艺术照片
["com.lockwidt.cn","sub","com.lockwidt.cn.member"], // 壁纸16
["Utsuki","sub","KameePro"], // 梦见账本
["one%20sec","sub","wtf.riedel.one_sec.pro.annual.individual"], // one sec番茄钟
["com.instagridpost.rsigp","sub","com.GridPost.oneyearplus"], // 九宫格切图
["com.skysoft.removalfree","sub","com.skysoft.removalfree.discount.unlimitedaccess"], // 神奇消除笔
["MGhostLens","sub","com.ghostlens.premium1month"], // 魔鬼相机
["Luminous","sub","com.spacemushrooms.weekly"], // 光影修图
["PerfectImage","sub","Perfect_Image_VIP_Yearly"], // 完美影像
["moment","sub","PYJMoment2"], // 片羽集
["Synthesizer","sub","com.qingxiu.synthesizer.mon"], // 语音合成
["ContractMaster","sub","com.qingxiu.contracts.monthly"], // 印象全能王
["MyDiary","sub","diary.yearly.vip.1029"], // 我的日记
["Translator","sub","trans_sub_week"], // 翻译家
["Idea","sub","top.ideaapp.ideaiOS.membership.oneyear"], // 灵感
["ZeroTuImg","sub","ZeroTuImgPlus"], // Zero壁纸
["com.traveltao.ExchangeAssistant","sub","lxbyplus"], // 极简汇率
["ServerKit","sub","com.serverkit.subscription.year.a"], // 服务器助手
["RawPlus","sub","com.dynamicappdesign.rawplus.yearlysubscription"], // Raw相机
["OrderGenerator","life","oder_pay_forever"], // 订单生成
["GenerateAllOrdersTool","sub","Order_Vip_010"], // 订单生成器
["MoMoShouZhang","sub","shunchangshouzhangQuarterlyPlus"], // 卡卡手账
["Mindkit","life","mindkit_permanently"], // Mindkit
["Miary","life","lifetime_sub"], // Miary日记
["BingQiTools","sub","bingqi_e2"], // 猫狗翻译
["AnyDown","life","com.xiaoqi.down.forever"], // AnyDown下载
["Reader","life","com.xiaoqi.reader.forever"], // 爱阅读
["com.bestmusicvideo.formmaster","sub","com.form.1yearvip"], // 表格大师
["ExcelSpreadSheetsWPS","sub","com.turbocms.SimpleSpreadSheet.viponeyear"], // 简易表格
["XinQingRiJi","sub","zhiwenshouzhangQuarterlyPlus"], // 猫咪手帐
["Nutrilio","sub","net.nutrilio.one_year_plus"], // Nutrilio
["AIHeader","sub","com.ai.avatar.maker.month.3dayfree"], // AI头像馆
["MoodTracker","life","co.vulcanlabs.moodtracker.lifetime2"], // ChatSmith
["com.dandelion.Routine","life","membership"], // 小日常
["YSBrowser","life","com.ys.pro"], // 亚瑟浏览器
["org.zrey.metion","sub","org.zrey.metion.pro"], // Metion（Pro部分）
["org.zrey.metion","sub","org.zrey.metion.main"], // Metion（基础部分）
["ZenJournal","sub","zen_pro"], // 禅记
["com.visualmidi.app.perfectpiano.Perfect-Piano","sub","auto_renew_monthly_subscription"], // 完美钢琴
["Straw","sub","com.1year.eyedropper"], // 吸管Pro
["vibee","sub","com.vibee.year.bigchampagne"], // vibee歌单小组件
["DrumPads","life","com.gismart.drumpads.pro_lifetime_30"], // BeatMakerGo
["WaterMaskCamera","sub","com.camera.watermark.yearly.3dayfree"], // 徕卡水印相机
["SymbolKeyboard","life","fronts.keyboard.singingfish.one"], // Fonts花样字体
["com.kuaijiezhilingdashi.appname","sub","com.othermaster.yearlyvip"], // 快捷指令库
["LogInput","sub","com.logcg.loginput"], // 落格输入法
["HandNote","life","permanent_membership"], // 千本笔记
["Kilonotes","sub","kipa_kilonotes_quarter_subscription"], // 千本笔记
["YiJianKouTu","sub","XiChaoYiJianKouTuPlus"], // 一键抠图
["FileArtifact","life","com.shengzhou.fileartifact.permanent"], // 文晓生
["Wext","life","com.lmf.wext.life"], // 万源阅读
["ColorCapture","life","10001"], // 色采
["xTerminal","sub","xterminal.pro2"], // xTerminal
["Fotoz","life","com.kiddy.fotoz.ipa.pro"], // Fotoz
["TheLastFilm","sub","Filmroll_Pro_1Year"], // 最后一卷胶片
["Motivation","sub","com.monkeytaps.motivation.premium.year3"], // Motivation
["io.sumi.GridDiary2","sub","io.sumi.GridDiary.pro.annually"], // 格志
["com.leapfitness.fasting","sub","com.leapfitness.fasting.oneyear1"], // 168轻断食
["WidgetBox","life","widgetlab001"], // 小组件盒子
["LifeTracker","sub","com.dk.lifetracker.yearplan"], // Becord
["imgplay","sub","me.imgbase.imgplay.subscriptionYearly"], // imgPlay
["WaterMinder","sub","waterminder.premiumYearly"], // WaterMinder
["HashPhotos","life","com.kobaltlab.HashPhotos.iap.proLifetime"], // HashPhotos
["SilProject","sub","com.sm.Alina.Pro"], // Alina
["com.chenxi.shanniankapian","sub","com.chenxi.shannian.superNian"], // 闪念
["com.risingcabbage.pro.camera","sub","com.risingcabbage.pro.camera.yearlysubscription"], // ReLens相机
["co.bazaart.patternator","sub","Patternator_Lock_Screen_Monthly"], // 拍特内头
["cn.linfei.SimpleRecorder","sub","cn.linfei.SimpleRecorder.Plus"], // 录音机
["BestColor","sub","com.bestColor.tool.month"], // 小红图
["com.decibel.tool","sub","decibel98free3"], // 分贝测试仪
["MeasurementTools","sub","mesurementyearvip"], // 测量工具
["TinyPNGTool","sub","com.tinypngtool.tool.weekvip"], // TinyPNG
["IconChange","sub","iconeryearvip"], // iconser
["com.floatcamellia.motionninja","sub","com.floatcamellia.motionninja.yearlyvip"], // MotionNinja
["com.iuuapp.audiomaker","sub","com.iuuapp.audiomaker.cloud.year"], // 音频剪辑（订阅部分）
["com.iuuapp.audiomaker","sub","com.iuuapp.audiomaker.removeads"], // 音频剪辑（去广告部分）
["com.biggerlens.photoretouch","life","com.photoretouch.SVIP"], // PhotoRetouch
["com.macpaw.iosgemini","sub","com.macpaw.iosgemini.month.trial"], // GeminiPhotos
["com.mematom.ios","sub","MMYear"], // 年轮3
["com.LuoWei.aDiary","sub","com.LuoWei.aDiary.yearly0"], // aDiary
["com.zerone.hidesktop","life","com.zerone.hidesktop.forever"], // iScreen
["MagicWidget","life","cf__forever_0_4.7.1"], // ColorfulWidget
["com.tasmanic.capture","sub","CTPCAPTUREYEARLY"], // 3DScanner
["com.readdle.CalendarsLite","sub","com.readdle.CalendarsLite.subscription.year20trial7"], // Calendars
["com.readdle.ReaddleDocsIPad","sub","com.readdle.ReaddleDocsIPad.subscription.month10_allusers"], // Documents
["com.1ps.lovetalk","sub","com.1ps.lovetalk.normal.weekly"], // 高级恋爱话术
["tech.miidii.MDClock","life","tech.miidii.MDClock.pro"], // 谜底时钟
["com.floatcamellia.prettyup","life","com.floatcamellia.prettyup.onetimepurchase"], // PrettyUp
["com.zijayrate.analogcam","sub","com.zijayrate.analogcam.vipforever10"], // oldroll复古相机
["net.daylio.Daylio","sub","net.daylio.one_year_pro.offer_initial"], // Daylio日记
["com.palmmob.pdfios","sub","com.palmmob.pdfios.168"], // 图片PDF转换
["com.palmmob.scanner2ios","sub","com.palmmob.scanner2ios.396"], // 文字扫描
["com.palmmob.officeios","sub","com.palmmob.officeios.188"], // 文档表格编辑
["com.palmmob.recorder","sub","com.palmmob.recorder.198"], // 录音转文字
["com.7color.newclean","sub","com.cleaner.salesyear"], // 手机清理
["Habbit","sub","HabitUpYearly"], // 习惯清单
["com.dbmeterpro.dB-Meter-Free","sub","com.dbmeterpro.premiumModeSubscriptionWithTrial"], // dBMeter
["com.vstudio.newpuzzle","sub","com.vstudio.newpuzzle.yearlyVipFreetrail.15_99"], // 拼图酱
["com.ziheng.OneBox","life","com.ziheng.OneBox"], // Pandora订阅管理
["ChickAlarmClock","life","Lifetime_Promotion"], // 小鸡专注
["com.CalculatorForiPad.InternetRocks","sub","co.airapps.calculator.year"], // 计算器Air
["SuperWidget","sub","com.focoslive"], // PandaWidget
["Picsew","life","com.sugarmo.ScrollClip.pro"], // Picsew截长图
["vpn","sub","yearautorenew"], // VPN-unlimited
["TT","sub","com.55panda.hicalculator.year_sub"], // TT私密相册
["Focos","sub","com.focos.1w_t4_1w"], // Focos
["ProKnockOut","sub","com.knockout.SVIP.50off"], // ProKnockOut（SVIP部分）
["ProKnockOut","sub","com.knockout.1year.AIVIP"], // ProKnockOut（AI部分）
["com.teadoku.flashnote","sub","pro_ios_ipad_mac"], // AnkiNote
// ---- 以下为原版 autoMap 自动生成的条目（product_id 为猜测，未核实） ----
["com.pocket","sub","com.pocket.year"], // NetPocket合集（猜测）
["com.xxtstudio.dailyspending","sub","com.xxtstudio.dailyspending.year"], // Daily记账（猜测）
["com.internet-rocks","sub","com.internet-rocks.year"], // Air Apps合集（猜测）
["co.airapps","sub","co.airapps.year"], // Air Apps合集（猜测）
["com.mkapps.Vcaption","sub","com.mkapps.Vcaption.yearly"], // VideoCaption（猜测）
["solutions.wzp","sub","solutions.wzp.yearlysubscription"], // Air Apps合集（猜测）
["com.ydgn.dokacamera","life","com.ydgn.dokacamera.lifetime"], // Doka相机（猜测）
["co.vulcanlabs","life","co.vulcanlabs.lifetime"], // Vulcan Labs合集（猜测）
["com.paha.CapyMood","life","com.paha.CapyMood.forever"], // CapyMood（猜测）
// 注意：原版 HiddenBox / PutApp（com.maliquankai.appdesign）条目无 product_id，
// 且依赖混淆代码的特殊注入路径，本版未收录
];

// ===== 工具函数 =====
function rand(n) {
    let s = '';
    for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 10);
    return s;
}
// Apple 收据日期格式："2026-10-03 11:00:00 Etc/GMT"
function appleDate(d) {
    return d.toISOString().replace(/\.\d{3}Z$/, 'Z').replace('T', ' ').replace('Z', ' Etc/GMT');
}
function appleDatePST(d) {
    const pst = new Date(d.getTime() - 7 * 3600 * 1000);
    return pst.toISOString().replace(/\.\d{3}Z$/, 'Z').replace('T', ' ').replace('Z', ' America/Los_Angeles');
}
// 多级容错解析（原版思路保留：截断 JSON / 正则兜底）
function tryParse(raw) {
    try { return JSON.parse(raw); } catch (e) {}
    if (typeof raw === 'string') {
        const start = raw.indexOf('{'), end = raw.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
            try { return JSON.parse(raw.substring(start, end + 1)); } catch (e) {}
        }
        const m = raw.match(/\{[\s\S]*\}/);
        if (m) { try { return JSON.parse(m[0]); } catch (e) {} }
    }
    return null;
}
// 构造一条伪造交易记录
function buildEntry(product, type, now, expire) {
    const tid = '49' + rand(16);
    const e = {
        quantity: '1',
        product_id: product,
        transaction_id: tid,
        original_transaction_id: tid,
        purchase_date: appleDate(now),
        purchase_date_ms: String(now.getTime()),
        purchase_date_pst: appleDatePST(now),
        original_purchase_date: appleDate(now),
        original_purchase_date_ms: String(now.getTime()),
        original_purchase_date_pst: appleDatePST(now),
        web_order_line_item_id: String(1000000000000000 + Math.floor(Math.random() * 899999999999999)),
        is_trial_period: 'false',
        is_in_intro_offer_period: 'false',
        in_app_ownership_type: 'PURCHASED'
    };
    if (type === 'sub') {
        e.expires_date = appleDate(expire);
        e.expires_date_ms = String(expire.getTime());
        e.expires_date_pst = appleDatePST(expire);
    }
    return e;
}
// 关键字匹配：key 与 UA/bundle_id 都做归一化（URL解码+去空格+小写）后比较开头
// 能兼容 "Water%20Reminder/2.0"、"Water Reminder/2.0"、"WaterReminder/2.0" 三种 UA 写法
function norm(s) {
    try { s = decodeURIComponent(s); } catch (e) {}
    return String(s).replace(/\s+/g, '').toLowerCase();
}
function keyMatches(key, ua, bid) {
    const nk = norm(key).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // 按字面量匹配
    let re;
    try { re = new RegExp('^' + nk); } catch (e) { return false; }
    if (re.test(norm(ua))) return true;
    if (bid && re.test(norm(bid))) return true;
    return false;
}

// ===== 主流程 =====
(function main() {
    const data = tryParse($response.body);
    if (!data || !data.receipt) {
        console.log('[iTunes] 收据解析失败或无 receipt 字段，放行');
        $done({});
        return;
    }

    const ua = $request.headers['User-Agent'] || $request.headers['user-agent'] || '';
    const bid = String(data.receipt.bundle_id || data.receipt.Bundle_Id || '').toLowerCase();

    // 排除名单：已购 App 直接放行
    if (bid && EXCLUDE_BUNDLE_IDS.includes(bid)) {
        console.log(`[iTunes] 命中排除名单，放行: ${bid}`);
        $done({});
        return;
    }

    // 名单匹配（同一 key 的多行全部注入，product 去重）
    const matched = [];
    const seenProducts = new Set();
    for (const [key, type, product] of APP_LIST) {
        if (!product || seenProducts.has(product)) continue;
        if (keyMatches(key, ua, bid)) {
            matched.push([type, product]);
            seenProducts.add(product);
        }
    }

    const now = new Date();
    const expire = new Date(FAKE_EXPIRES);

    if (matched.length > 0) {
        const subs = [], lifes = [];
        for (const [type, product] of matched) {
            (type === 'sub' ? subs : lifes).push(buildEntry(product, type, now, expire));
        }
        const all = subs.concat(lifes);
        data.receipt.in_app = all;
        data.latest_receipt_info = all;
        if (subs.length > 0) {
            data.pending_renewal_info = subs.map(s => ({
                product_id: s.product_id,
                original_transaction_id: s.transaction_id,
                auto_renew_product_id: s.product_id,
                auto_renew_status: '1'
            }));
        }
        console.log(`[iTunes] 注入完成: ${bid || ua} <- ${matched.map(m => m[1]).join(', ')}`);
        $done({ body: JSON.stringify(data) });
        return;
    }

    // 未命中名单：检查已有购买记录
    const inApp = Array.isArray(data.receipt.in_app) ? data.receipt.in_app : [];
    if (inApp.length > 0) {
        let updated = false;
        const nowMs = Date.now();
        for (const item of inApp) {
            if (!item || !item.product_id || !item.expires_date) continue; // 无到期时间=永久有效，跳过
            const expMs = item.expires_date_ms ? Number(item.expires_date_ms) : 0;
            if (expMs < nowMs) {
                item.expires_date = appleDate(expire);
                item.expires_date_ms = String(expire.getTime());
                item.expires_date_pst = appleDatePST(expire);
                updated = true;
            }
        }
        if (updated) {
            console.log(`[iTunes] 未命中名单，已有过期订阅已延期到 2099: ${bid || ua}`);
            $done({ body: JSON.stringify(data) });
        } else {
            console.log(`[iTunes] 未命中名单，已有有效/永久订阅，放行: ${bid || ua}`);
            $done({});
        }
        return;
    }

    // 无任何购买记录
    if (ENABLE_BLIND_FALLBACK && bid) {
        const product = `${bid}.yearly`;
        const entry = buildEntry(product, 'sub', now, expire);
        data.receipt.in_app = [entry];
        data.latest_receipt_info = [entry];
        data.pending_renewal_info = [{
            product_id: product,
            original_transaction_id: entry.transaction_id,
            auto_renew_product_id: product,
            auto_renew_status: '1'
        }];
        console.log(`[iTunes] 盲猜注入: ${bid} <- ${product}`);
        $done({ body: JSON.stringify(data) });
        return;
    }

    console.log(`[iTunes] 未命中名单且无购买记录，放行: ${bid || ua}`);
    $done({});
})();
