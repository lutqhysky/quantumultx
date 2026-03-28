const SCRIPT_NAME = "NEBOX 探针";

const targets = [
  "http://boxjs.com/query/boxdata",
  "http://127.0.0.1:9999/query/boxdata",
  "http://localhost:9999/query/boxdata",

  "http://boxjs.com/query/data/@cpta.keywords",
  "http://127.0.0.1:9999/query/data/@cpta.keywords",
  "http://localhost:9999/query/data/@cpta.keywords",

  "http://boxjs.com/query/data/%40cpta.keywords",
  "http://127.0.0.1:9999/query/data/%40cpta.keywords",
  "http://localhost:9999/query/data/%40cpta.keywords"
];

function httpGet(url) {
  return new Promise((resolve) => {
    $httpClient.get({ url: url }, (err, resp, data) => {
      if (err) {
        resolve({
          url,
          ok: false,
          status: "ERR",
          body: String(err)
        });
      } else {
        resolve({
          url,
          ok: true,
          status: resp ? resp.status : "NO_STATUS",
          body: data || ""
        });
      }
    });
  });
}

(async () => {
  const results = [];

  for (const url of targets) {
    const r = await httpGet(url);
    let preview = r.body;
    if (preview.length > 120) preview = preview.slice(0, 120) + "...";
    results.push(
      `[${r.status}] ${url}\n${preview || "(empty)"}`
    );
  }

  const content = results.join("\n\n");

  $done({
    title: SCRIPT_NAME,
    content,
    icon: "wrench.and.screwdriver",
    "icon-color": "#007aff"
  });
})();
