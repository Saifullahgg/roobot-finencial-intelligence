const demoNews = [
    { id: 1, time: "16:42", asset: "CRYPTO", title: "Bitcoin resistance ke qareeb, ETF flows par traders ki nazar", summary: "BTC $112K zone mein consolidate kar raha hai. Institutional inflows sentiment ko support kar rahe hain.", impact: "HIGH", source: "ROOBOT demo feed" },
    { id: 2, time: "16:18", asset: "STOCKS", title: "US futures green, tech stocks earnings se pehle recover", summary: "Nasdaq futures 0.42% upar. Semiconductor aur AI names mein buying interest dekha gaya.", impact: "WATCH", source: "ROOBOT demo feed" },
    { id: 3, time: "15:55", asset: "FOREX", title: "Dollar index strong, markets CPI release ka wait kar rahe hain", summary: "DXY 104.80 ke upar hold kar raha hai. EUR/USD par pressure barqarar hai.", impact: "HIGH", source: "ROOBOT demo feed" },
    { id: 4, time: "15:27", asset: "CRYPTO", title: "Ethereum network activity mein tez izafa report hua", summary: "ETH active addresses barhe hain, lekin options market abhi cautious positioning dikha raha hai.", impact: "WATCH", source: "ROOBOT demo feed" },
    { id: 5, time: "14:50", asset: "STOCKS", title: "Asia shares mixed, Nikkei ne session lead kiya", summary: "Regional markets mein rotation jari hai. Japan exporters ko weaker yen se support mila.", impact: "WATCH", source: "ROOBOT demo feed" },
    { id: 6, time: "14:12", asset: "FOREX", title: "Gold aur yen volatility ke darmiyan safe-haven demand", summary: "Geopolitical risk ki wajah se investors defensive assets ki taraf move kar rahe hain.", impact: "HIGH", source: "ROOBOT demo feed" }
];

let cache = { expires: 0, data: null };

function providerErrorCode(status) {
    if (status === 401 || status === 403) return "GNEWS_AUTH_FAILED";
    if (status === 429) return "GNEWS_RATE_LIMIT";
    if (status >= 500) return "GNEWS_SERVER_ERROR";
    return `GNEWS_HTTP_${status}`;
}

function classify(title, description = "") {
    const text = `${title} ${description}`.toLowerCase();
    return /cpi|inflation|interest rate|fed|fomc|ecb|jobs report|payroll|gdp|recession|regulation|sec |etf|hack|sanction|war|crash|surge|earnings|bankruptcy|volatility/.test(text) ? "HIGH" : "WATCH";
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

async function fetchLiveNews(apiKey) {
    if (!apiKey) return { items: demoNews, live: false, fallback: true, errorCode: "GNEWS_KEY_MISSING", message: "Demo feed active — Vercel mein GNEWS_API_KEY set karein." };
    const endpoint = new URL("https://gnews.io/api/v4/search");
    endpoint.searchParams.set("q", "bitcoin OR cryptocurrency OR stocks OR forex");
    endpoint.searchParams.set("lang", "en");
    endpoint.searchParams.set("max", "10");
    endpoint.searchParams.set("apikey", apiKey);
    const response = await fetch(endpoint);
    if (!response.ok) {
        const code = providerErrorCode(response.status);
        let reason = "Provider rejected the request";
        try {
            const errorPayload = await response.json();
            reason = String(errorPayload.errors?.[0] || errorPayload.message || errorPayload.error || reason).slice(0, 180);
        } catch (parseError) { /* provider returned a non-JSON error */ }
        throw Object.assign(new Error(code), { code, status: response.status, reason });
    }
    const payload = await response.json();
    const items = (payload.articles || []).map(mapArticle);
    if (!items.length) return { items: demoNews, live: false, fallback: true, errorCode: "GNEWS_EMPTY", message: "GNews ne koi article return nahi kiya — demo fallback active." };
    return { items, live: true, fallback: false, message: "Live GNews feed active." };
}

async function getNews(apiKey) {
    if (cache.data && cache.expires > Date.now()) return cache.data;
    try {
        const data = await fetchLiveNews(apiKey);
        cache = { data, expires: Date.now() + (data.fallback ? 30_000 : 5 * 60 * 1000) };
        return data;
    } catch (error) {
        const errorCode = error.code || "GNEWS_REQUEST_FAILED";
        console.error("News provider error:", errorCode, error.status || "network", error.reason || "");
        const fallback = { items: demoNews, live: false, fallback: true, errorCode, errorReason: error.reason || "Provider request failed", message: "Live provider unavailable — safe demo fallback active." };
        cache = { data: fallback, expires: Date.now() + 30_000 };
        return fallback;
    }
}

module.exports = { getNews };
