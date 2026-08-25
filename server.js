const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

loadEnvFile();
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const GNEWS_API_KEY = process.env.GNEWS_API_KEY || "";
const CACHE_MS = 5 * 60 * 1000;
let cache = { expires: 0, data: null };

const demoNews = [
    { id: 1, time: "16:42", asset: "CRYPTO", title: "Bitcoin resistance ke qareeb, ETF flows par traders ki nazar", summary: "BTC $112K zone mein consolidate kar raha hai. Institutional inflows sentiment ko support kar rahe hain.", impact: "HIGH", source: "ROOBOT demo feed" },
    { id: 2, time: "16:18", asset: "STOCKS", title: "US futures green, tech stocks earnings se pehle recover", summary: "Nasdaq futures 0.42% upar. Semiconductor aur AI names mein buying interest dekha gaya.", impact: "WATCH", source: "ROOBOT demo feed" },
    { id: 3, time: "15:55", asset: "FOREX", title: "Dollar index strong, markets CPI release ka wait kar rahe hain", summary: "DXY 104.80 ke upar hold kar raha hai. EUR/USD par pressure barqarar hai.", impact: "HIGH", source: "ROOBOT demo feed" },
    { id: 4, time: "15:27", asset: "CRYPTO", title: "Ethereum network activity mein tez izafa report hua", summary: "ETH active addresses barhe hain, lekin options market abhi cautious positioning dikha raha hai.", impact: "WATCH", source: "ROOBOT demo feed" },
    { id: 5, time: "14:50", asset: "STOCKS", title: "Asia shares mixed, Nikkei ne session lead kiya", summary: "Regional markets mein rotation jari hai. Japan exporters ko weaker yen se support mila.", impact: "WATCH", source: "ROOBOT demo feed" },
    { id: 6, time: "14:12", asset: "FOREX", title: "Gold aur yen volatility ke darmiyan safe-haven demand", summary: "Geopolitical risk ki wajah se investors defensive assets ki taraf move kar rahe hain.", impact: "HIGH", source: "ROOBOT demo feed" }
];

function loadEnvFile() {
    const envPath = path.join(__dirname, ".env");
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*["']?([^"']*)["']?\s*$/);
        if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
    }
}

function classify(title, description = "") {
    const text = `${title} ${description}`.toLowerCase();
    const highImpact = /cpi|inflation|interest rate|fed|fomc|ecb|jobs report|payroll|gdp|recession|regulation|sec |etf|hack|sanction|war|crash|surge|earnings|bankruptcy|volatility/.test(text);
    return highImpact ? "HIGH" : "WATCH";
}

function assetFor(text) {
    const value = text.toLowerCase();
    if (/bitcoin|crypto|ethereum|blockchain|token|coin|digital asset|btc|eth/.test(value)) return "CRYPTO";
    if (/forex|currency|dollar|euro|yen|pound|sterling|fx |exchange rate/.test(value)) return "FOREX";
    return "STOCKS";
}

function mapArticle(article, index) {
    const title = article.title || "Untitled market update";
    const description = article.description || "Live market news update available.";
    const published = article.publishedAt ? new Date(article.publishedAt) : new Date();
    return { id: `live-${index}-${published.getTime()}`, time: published.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }), asset: assetFor(`${title} ${description}`), title, summary: description, impact: classify(title, description), source: article.source?.name || "GNews", url: article.url || "" };
}

async function fetchLiveNews() {
    if (!GNEWS_API_KEY) return { items: demoNews, live: false, message: "Demo feed active — GNEWS_API_KEY add karke live feed on karein." };
    const endpoint = new URL("https://gnews.io/api/v4/search");
    endpoint.searchParams.set("q", "financial markets OR bitcoin OR stocks OR forex");
    endpoint.searchParams.set("lang", "en");
    endpoint.searchParams.set("max", "10");
    endpoint.searchParams.set("sortby", "publishedAt");
    endpoint.searchParams.set("apikey", GNEWS_API_KEY);
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error(`GNews returned ${response.status}`);
    const payload = await response.json();
    return { items: (payload.articles || []).map(mapArticle), live: true, message: "Live GNews feed active." };
}

async function getNews() {
    if (cache.data && cache.expires > Date.now()) return cache.data;
    try { cache = { data: await fetchLiveNews(), expires: Date.now() + CACHE_MS }; return cache.data; }
    catch (error) { console.error("News provider error:", error.message); const fallback = { items: demoNews, live: false, message: "Live provider unavailable — safe demo fallback active." }; cache = { data: fallback, expires: Date.now() + 30_000 }; return fallback; }
}

function sendJson(response, status, body) {
    response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" });
    response.end(JSON.stringify(body));
}

const server = http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    if (requestUrl.pathname === "/api/news") return sendJson(response, 200, await getNews());
    if (requestUrl.pathname === "/api/health") return sendJson(response, 200, { ok: true, liveProvider: Boolean(GNEWS_API_KEY), cached: Boolean(cache.data) });
    const requested = requestUrl.pathname === "/" ? "index.html" : requestUrl.pathname.slice(1);
    const filePath = path.resolve(ROOT, requested);
    if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return sendJson(response, 404, { error: "Not found" });
    const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript" };
    response.writeHead(200, { "Content-Type": types[path.extname(filePath)] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(response);
});

server.listen(PORT, () => console.log(`R.O.O.B.O.T. running at http://localhost:${PORT} — ${GNEWS_API_KEY ? "live provider configured" : "demo fallback"}`));
