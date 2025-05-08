let scriptName = '草榴技術討論區',
    $ = new Env(scriptName),
    baseURL = 'https://t66y.com/',
    isRandom = $.getdata('1024_israndom') || false;

!(async () => {
    const postList = await getPosts();
    var { post, postContent } = await findValidPost(postList);
    $.msg(
        `🔔${scriptName}`,
        `《${post.title}》\n【发布时间】\n${$.time('yyyy-MM-dd HH:mm:ss', post.date)}`,
        postContent,
        { 'open-url': post.href }
    );
})()
.catch((e) => $.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, ''))
.finally(() => $.done());

async function findValidPost(postList) {
    try {
        const random = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);
        let validPosts = postList.filter(post => {
            return post.title.includes('兲朝浮世绘') || post.title.includes('微语录精选');
        });
        let randomIdx = random(0, validPosts.length - 1);
        let post = validPosts[randomIdx];
        let postContent = await getPostContent(post);
        return { post, postContent };
    } catch (e) {
        throw e;
    }
}

function getPosts() {
    const url = baseURL + 'thread0806.php?fid=7&search=today';
    return new Promise(async (resolve, reject) => {
        const html = await Request({ url, method: 'get', use_proxy: true });
        try {
            var posts = html
               .replace(/\n|\s|\r/g, '')
               .match(/<tbody.*?id="tbody">(.*?)<\/tbody>/g)[0]
               .match(/<tbodystyle="table-layout:fixed;"id="tbody">(.*?)<\/tbody>/)[1]
               .match(/<trclass="tr3t_onetac">(.*?)<\/tr>/g)
               .map((item) => {
                    try {
                        let [, href, title, date] = item.match(
                            /<h3><ahref="(.*?)".*?>(.*?)<\/a><\/h3>.*?data-timestamp="(.*?)"/
                        );
                        title = title.replace(/<.*?>/g, '');
                        date = Number(date.slice(-1))? date : date.slice(0, -1);
                        return { href: baseURL + href, title, date: date * 1e3 };
                    } catch (e) {
                        return {};
                    }
                })
               .filter((item) =>!/[\d+P]/.test(item.title));
            resolve(posts);
        } catch (e) {
            reject(e || '获取帖子失败');
        }
    });
}

function getPostContent(obj) {
    let { href, title, date } = obj;
    $.log('', ` 《${title}》`, '【发布时间】', $.time('yyyy-MM-dd HH:mm:ss', date), '');
    return new Promise(async (resolve, reject) => {
        const html = await Request({ url: href, method: 'get', use_proxy: true });
        try {
            var postContent = html
               .replace(/\n|\s|\r/g, '')
               .match(/<tdbgcolor.*?valign="top">(.*?)<\/td>/)[0]
               .match(/<div.*?id="conttpc">(.*?)<\/div>/)[1]
               .replace(/<br><br>/g, '\n')
               .replace(/<br>/g, '\n')
               .replace(/&nbsp;/g, '')
               .replace(/&amp;/g, '&')
               .replace(/&quot;/g, '"')
               .replace(/&lt;/g, '<')
               .replace(/&gt;/g, '>')
               .replace(/<.*?>/g, '');
            resolve(postContent);
        } catch (e) {
            reject(e || '获取帖子内容失败');
        }
    });
}

function Request(options) {
    if (!options.method) throw '请求方式未指定';
    const method = options.method.toLocaleLowerCase();
    if ($.isNode() && options?.use_proxy) {
        const tunnel = require('tunnel');
        const agent = {
            https: tunnel.httpsOverHttp({
                proxy: {
                    host: '127.0.0.1',
                    port: 7890
                }
            })
        };
        Object.assign(options, { agent });
    }
    return new Promise((resolve, reject) => {
        $.http[method](options)
           .then((response) => {
                resolve(response.body);
            })
           .catch((err) => reject(err));
    });
}