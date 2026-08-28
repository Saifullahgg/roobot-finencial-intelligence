let newsData = [
    { id: 1, time: "16:42", asset: "CRYPTO", title: "Bitcoin resistance ke qareeb, ETF flows par traders ki nazar", summary: "BTC $112K zone mein consolidate kar raha hai. Institutional inflows sentiment ko support kar rahe hain.", impact: "HIGH" },
    { id: 2, time: "16:18", asset: "STOCKS", title: "US futures green, tech stocks earnings se pehle recover", summary: "Nasdaq futures 0.42% upar. Semiconductor aur AI names mein buying interest dekha gaya.", impact: "WATCH" },
    { id: 3, time: "15:55", asset: "FOREX", title: "Dollar index strong, markets CPI release ka wait kar rahe hain", summary: "DXY 104.80 ke upar hold kar raha hai. EUR/USD par pressure barqarar hai.", impact: "HIGH" },
    { id: 4, time: "15:27", asset: "CRYPTO", title: "Ethereum network activity mein tez izafa report hua", summary: "ETH active addresses barhe hain, lekin options market abhi cautious positioning dikha raha hai.", impact: "WATCH" },
    { id: 5, time: "14:50", asset: "STOCKS", title: "Asia shares mixed, Nikkei ne session lead kiya", summary: "Regional markets mein rotation jari hai. Japan exporters ko weaker yen se support mila.", impact: "WATCH" },
    { id: 6, time: "14:12", asset: "FOREX", title: "Gold aur yen volatility ke darmiyan safe-haven demand", summary: "Geopolitical risk ki wajah se investors defensive assets ki taraf move kar rahe hain.", impact: "HIGH" }
];

const $ = (selector) => document.querySelector(selector);
const newsList = $("#newsList");
let selectedAsset = "ALL";
let recognition = null;
let isListening = false;
let alwaysReady = false;
let speechSupported = false;
let recognitionLanguage = "en-PK";
let liveFeed = false;
let responseText = "";
let conversation = [];
let aiRequest = null;
let intelligenceData = null;

let marketData = null;

function escapeHtml(value = "") {
    const entityCodes = { 34: 34, 38: 38, 39: 39, 60: 60, 62: 62 };
    return String(value).replace(/[&<>"']/g, (character) =>
        String.fromCharCode(38, 35) + entityCodes[character.charCodeAt(0)] + String.fromCharCode(59)
    );
}

function safeArticleUrl(value = "") {
    try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch (error) {
        return "";
    }
}
let knownHighImpactIds = new Set(newsData.filter((item) => item.impact === "HIGH").map((item) => item.id));

function renderNews() {
    const query = $("#searchInput").value.trim().toLowerCase();
    const visible = newsData.filter((item) => {
        const matchesAsset = selectedAsset === "ALL" || item.asset === selectedAsset;
        const searchable = `${item.title} ${item.summary} ${item.asset}`.toLowerCase();
        return matchesAsset && searchable.includes(query);
    });
    newsList.innerHTML = visible.length ? visible.map((item) => `
    <article class="news-row">
      <time class="news-time">${item.time}</time>
      <div class="news-copy"><strong>${safeArticleUrl(item.url) ? `<a href="${safeArticleUrl(item.url)}" target="_blank" rel="noopener">${escapeHtml(item.title)}</a>` : escapeHtml(item.title)}</strong><p>${escapeHtml(item.summary)}</p><small class="news-source">${escapeHtml(item.source || "ROOBOT feed")}${item.impact === "HIGH" ? " · HIGH IMPACT" : ""}</small></div>
      <span class="tag ${escapeHtml(item.asset.toLowerCase())}">${escapeHtml(item.asset)}</span>
    </article>`).join("") : `<div class="empty-state">Is filter ke liye koi khabar nahi mili.</div>`;
}

function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 3200);
}

function setRobotState(state) {
    const labels = {
        standby: ["STANDBY", "Online & Ready", "Aapki awaaz ka intezar hai..."],
        listening: ["LISTENING", "Listening...", "Aap bol sakte hain..."],
        analyzing: ["ANALYZING", "Analyzing...", "Market data samjha ja raha hai..."],
        responding: ["RESPONDING", "Speaking...", "Robot aapko jawab de raha hai..."]
    };
    const [mode, scan, status] = labels[state] || labels.standby;
    $("#faceMode").textContent = mode;
    $("#scanLabel").textContent = scan;
    $("#transcriptStatus").textContent = status;
    $("#voiceTitle").textContent = state === "standby" ? "Ask Robot" : mode[0] + mode.slice(1).toLowerCase();
    $("#voice").dataset.state = state;
}

function chooseFemaleVoice() {
    if (!("speechSynthesis" in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.filter((voice) => /female|woman|zira|samantha|susan|hazel|google uk english female|microsoft/i.test(voice.name));
    const language = voices.filter((voice) => /ur(-|_)PK|hi(-|_)IN|en(-|_)IN|en(-|_)GB/i.test(voice.lang));
    return preferred.find((voice) => /ur|hi|en/i.test(voice.lang)) || preferred[0] || language[0] || voices[0] || null;
}

function speak(text) {
    responseText = text;
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = chooseFemaleVoice();
    if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
    } else utterance.lang = "ur-PK";
    utterance.rate = 0.92;
    utterance.pitch = 1.08;
    utterance.onstart = () => setRobotState("responding");
    utterance.onend = () => { if (!isListening) setRobotState("standby"); };
    window.speechSynthesis.speak(utterance);
}

function setListening(nextState) {
    isListening = nextState;
    $("#listenButton").classList.toggle("listening", nextState);
    $("#floatingMic").classList.toggle("listening", nextState);
    $("#listenLabel").textContent = nextState ? "MAIN SUN RAHA HUN..." : "TAP TO SPEAK";
    setRobotState(nextState ? "listening" : "standby");
}

function getMarketItems(asset = selectedAsset) {
    return newsData.filter((item) => asset === "ALL" || item.asset === asset);
}

function marketSummary(asset = selectedAsset) {
    const items = getMarketItems(asset);
    if (!items.length) return "Is market ke liye abhi feed mein news available nahi hai.";
    const lead = items[0];
    const highCount = items.filter((item) => item.impact === "HIGH").length;
    const label = asset === "ALL" ? "overall markets" : asset.toLowerCase();
    return `${label} mein ${items.length} updates milay hain. Sab se important update: ${lead.title}. ${highCount ? `${highCount} high-impact alert${highCount > 1 ? "s" : ""} bhi watch par hain.` : "Filhal koi high-impact alert nahi mila."}`;
}

function localAssistantReply(rawText) {
    const text = rawText.toLowerCase().replace(/[?!.,]/g, " ").replace(/\s+/g, " ").trim();
    const latest = newsData[0];
    const highImpact = newsData.filter((item) => item.impact === "HIGH");
    const has = (...words) => words.some((word) => text.includes(word));
    let reply;

    if (has("hello", "hi", "salam", "assalam", "hey", "aoa")) {
        reply = "Walaikum assalam. Main ROOBOT hun, aapka market intelligence assistant. Aaj kis market ko scan karun?";
    } else if (has("thank", "shukriya", "thanks")) {
        reply = "Khushi hui. Main aapke liye crypto, stocks aur forex monitor karta rahunga.";
    } else if (has("tum kon", "who are", "what can", "kya kar sakte", "capabilit")) {
        reply = "Main Roman Urdu ya English mein aap se baat kar sakta hun, live news summarize kar sakta hun, market filters change kar sakta hun aur high-impact updates identify kar sakta hun.";
    } else if (has("bitcoin", "btc", "crypto", "cryptocurrency")) {
        selectedAsset = "CRYPTO"; updateTabs();
        reply = `Crypto feed active kar di hai. ${marketSummary("CRYPTO")}`;
    } else if (has("stock", "shares", "nasdaq", "equity", "stocks")) {
        selectedAsset = "STOCKS"; updateTabs();
        reply = `Stocks feed active kar di hai. ${marketSummary("STOCKS")}`;
    } else if (has("forex", "dollar", "currency", "eur", "yen", "pound", "fx")) {
        selectedAsset = "FOREX"; updateTabs();
        reply = `Forex feed active kar di hai. ${marketSummary("FOREX")}`;
    } else if (has("high impact", "important", "aham", "impact", "alert", "urgent")) {
        reply = highImpact.length ? `High-impact updates ${highImpact.length} hain. ${highImpact.slice(0, 2).map((item) => item.title).join(" Aur ")}` : "Filhal feed mein high-impact alert nahi mila.";
    } else if (has("latest", "newest", "recent", "taza", "news", "khabar", "update")) {
        reply = latest ? `Latest update: ${latest.title}. ${latest.summary}` : "Live feed se abhi news receive nahi hui.";
    } else if (has("event", "calendar", "cpi", "nfp", "fomc", "aanay wali", "upcoming", "kab news")) {
        const event = intelligenceData?.events?.[0];
        reply = event ? `Agla high-impact event ${event.title} hai, ${formatPktTime(event.scheduledAt)}. Mutasir assets: ${event.affectedAssets.join(", ")}. ${event.baseCase} Confidence ${event.confidence} percent.` : "Upcoming events ka data abhi load ho raha hai.";
    } else if (has("airdrop", "air drop", "claim", "testnet", "points")) {
        const item = intelligenceData?.airdrops?.[0];
        reply = item ? `Airdrop radar mein ${item.project} ${item.status} status ke sath listed hai. Confidence ${item.confidence} percent aur risk ${item.risk} hai. ${item.safety}` : "Airdrop radar ka data abhi load ho raha hai.";
    } else if (has("brief", "summary", "summarize", "khulasah", "market kaisa", "markets")) {
        reply = marketSummary("ALL");
    } else if (has("refresh", "reload", "dobara")) {
        refreshFeed();
        reply = "Feed refresh kar raha hun. Naya data aate hi dashboard update ho jayega.";
    } else if (has("risk", "safe", "invest", "buy", "sell", "trade")) {
        reply = "Market decisions mein risk management zaroori hai. Main factual news aur possible impact explain kar sakta hun, lekin guaranteed buy ya sell signal nahi de sakta.";
    } else if (has("weather", "time", "joke", "story")) {
        reply = "Main abhi financial intelligence ke liye optimized hun. Crypto, stocks, forex ya market news ke bare mein poochain.";
    } else {
        reply = "Main aapki baat samajhne ki koshish kar raha hun. Aap keh sakte hain: Bitcoin ki latest news, market brief, high-impact alerts, ya stocks ka update.";
    }
    return reply;
}

function formatPktTime(value) {
    return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) + " PKT";
}

function renderIntelligence(payload) {
    intelligenceData = payload;
    const events = payload.events || [];
    const airdrops = payload.airdrops || [];
    $("#eventCount").textContent = `${events.length} TRACKED`;
    $("#airdropCount").textContent = `${airdrops.length} TRACKED`;
    $("#eventList").innerHTML = events.map((event) => `<div class="intel-item"><div class="intel-item-head"><strong>${escapeHtml(event.title)}</strong><span class="score-high">${event.impactScore}/100</span></div><p>${escapeHtml(formatPktTime(event.scheduledAt))} · ${escapeHtml(event.affectedAssets.join(", "))}</p><small>${escapeHtml(event.baseCase)} Confidence: ${event.confidence}%</small></div>`).join("");
    $("#airdropList").innerHTML = airdrops.map((item) => `<div class="intel-item"><div class="intel-item-head"><strong>${escapeHtml(item.project)}</strong><span class="airdrop-status">${escapeHtml(item.status)}</span></div><p>${escapeHtml(item.chain)} · Risk ${escapeHtml(item.risk)} · Score ${item.opportunityScore}/100</p><small>${escapeHtml(item.requirement)}</small></div>`).join("");
}

async function loadIntelligence() {
    try {
        const response = await fetch(`/api/intelligence?ts=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`API ${response.status}`);
        renderIntelligence(await response.json());
    } catch (error) {
        $("#eventList").innerHTML = `<div class="empty-state">Intelligence API abhi available nahi hai.</div>`;
        $("#airdropList").innerHTML = `<div class="empty-state">Airdrop radar abhi available nahi hai.</div>`;
        console.error("ROOBOT intelligence error:", error);
    }
}

function respondToCommand(rawText) {
    const text = rawText.trim();
    if (!text) return;
    setRobotState("analyzing");
    $("#transcript").textContent = `“ ${text} ”`;
    conversation.push({ role: "user", content: text });
    const reply = localAssistantReply(text);
    conversation.push({ role: "assistant", content: reply });
    conversation = conversation.slice(-12);
    $("#briefText").textContent = reply;
    window.setTimeout(() => { speak(reply); showToast(reply); }, 180);
}

function updateTabs() {
    document.querySelectorAll(".asset-tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.asset === selectedAsset));
    renderNews();
}

function runCommand(command) {
    respondToCommand(command);
    $("#voice").scrollIntoView({ behavior: "smooth", block: "center" });
}

function navigateTo(page) {
    const targets = { home: "#home", news: "#news", voice: "#voice" };
    if (targets[page]) $(targets[page]).scrollIntoView({ behavior: "smooth", block: "start" });
    if (!targets[page]) showToast(`${page[0].toUpperCase()}${page.slice(1)} module ready hai.`);
    document.querySelectorAll("[data-page]").forEach((item) => item.classList.toggle("active", item.dataset.page === page));
    $("#sidebar").classList.remove("open");
}

function updateMarketAsset(asset) {
    const symbolNode = $("#marketPrice").previousElementSibling;
    const priceNode = $("#marketPrice");
    const changeNode = priceNode.nextElementSibling;
    const orb = document.querySelector(".market-orb");

    if (!marketData || !marketData.crypto.length) {
        symbolNode.textContent = asset.split(" / ")[0];
        priceNode.textContent = "No live data";
        changeNode.childNodes[0].textContent = "— ";
        changeNode.classList.remove("positive", "negative");
        if (orb) orb.textContent = "?";
        $("#marketConnectionText").textContent = "OFFLINE";
        return;
    }

    const symbol = asset.split(" / ")[0];
    const coin = marketData.crypto.find((c) => c.symbol === symbol) || marketData.crypto[0];
    symbolNode.textContent = coin.name.toUpperCase();
    priceNode.textContent = coin.price ? `$${coin.price.toLocaleString()}` : "N/A";
    const changeText = coin.change24h !== null ? `${coin.change24h >= 0 ? '+' : ''}${coin.change24h.toFixed(2)}%` : "N/A";
    changeNode.childNodes[0].textContent = `${changeText} `;
    changeNode.classList.toggle("positive", coin.change24h > 0);
    changeNode.classList.toggle("negative", coin.change24h < 0);
    if (orb) orb.textContent = coin.symbol ? coin.symbol.charAt(0) : "₿";
    $("#marketConnectionText").textContent = marketData.cryptoError || marketData.forexError ? "DEGRADED" : "LIVE";
}

function renderPopularCoins() {
    const container = $("#popularCoins");
    if (!container) return;
    if (!marketData || !marketData.crypto.length) {
        container.innerHTML = `<div class="empty-state">Live coin prices abhi available nahi hain.</div>`;
        return;
    }
    const coins = marketData.crypto.slice(0, 4);
    container.innerHTML = coins.map((coin) => {
        const changeClass = coin.change24h > 0 ? "positive" : coin.change24h < 0 ? "negative" : "";
        const changeText = coin.change24h !== null ? `${coin.change24h >= 0 ? '+' : ''}${coin.change24h.toFixed(2)}%` : "N/A";
        return `<div><i class="coin ${coin.symbol.toLowerCase()}">${coin.symbol.charAt(0)}</i><span><b>${escapeHtml(coin.name)}</b><small>${escapeHtml(coin.symbol)}</small></span><strong>${coin.price ? `$${coin.price.toLocaleString()}` : "N/A"}</strong><em class="${changeClass}">${changeText}</em></div>`;
    }).join("");
}

function updateMarketStats() {
    if (!marketData || !marketData.crypto.length) return;
    const capNode = document.querySelector(".market-stats span:nth-child(1) b");
    const volNode = document.querySelector(".market-stats span:nth-child(2) b");
    const domNode = document.querySelector(".market-stats span:nth-child(3) b");
    const sentNode = document.querySelector(".market-stats span:nth-child(4) b");
    if (capNode && marketData.crypto[0]?.marketCap) capNode.textContent = `$${(marketData.crypto[0].marketCap / 1e12).toFixed(2)}T`;
    if (volNode && marketData.crypto[0]?.volume24h) volNode.textContent = `$${(marketData.crypto[0].volume24h / 1e9).toFixed(1)}B`;
    if (domNode && marketData.summary.btcDominance !== null) domNode.textContent = `${marketData.summary.btcDominance}%`;
    if (sentNode && marketData.summary.marketSentiment) {
        sentNode.textContent = marketData.summary.marketSentiment;
        sentNode.className = marketData.summary.marketSentiment === "BULLISH" ? "positive" : marketData.summary.marketSentiment === "BEARISH" ? "negative" : "";
    }
}

async function loadMarketData() {
    try {
        const response = await fetch(`/api/market?ts=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`API ${response.status}`);
        marketData = await response.json();
        const selectedAsset = $("#marketAsset").value;
        updateMarketAsset(selectedAsset);
        renderPopularCoins();
        updateMarketStats();
    } catch (error) {
        console.error("ROOBOT market data error:", error);
        $("#marketConnectionText").textContent = "ERROR";
    }
}

function stopRecognition() {
    if (recognition) recognition.stop();
    setListening(false);
}

function startRecognition() {
    if (!speechSupported) { showToast("Is browser mein voice recognition supported nahi hai. Text buttons istemal karein."); return; }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    try { recognition.start(); } catch (error) { /* recognition pehle se running hai */ }
}

function setupRecognition() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { $("#connectionLabel").textContent = "VOICE API UNAVAILABLE"; return; }
    speechSupported = true;
    recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.lang = recognitionLanguage;
    recognition.onstart = () => setListening(true);
    recognition.onresult = (event) => {
        const result = event.results[event.results.length - 1];
        const alternatives = Array.from(result).map((item) => item.transcript.trim()).filter(Boolean);
        const text = alternatives.sort((a, b) => b.length - a.length)[0] || "";
        $("#transcript").textContent = `“ ${text} ”`;
        if (result.isFinal && text) respondToCommand(text);
    };
    recognition.onerror = (event) => {
        const messages = {
            "not-allowed": "Microphone permission allow karna zaroori hai.",
            "no-speech": "Awaaz samajh nahi aayi. Mic ke qareeb dobara bolain.",
            "audio-capture": "Microphone available nahi hai.",
            network: "Voice service network se connect nahi ho saki."
        };
        if (event.error === "not-allowed") { alwaysReady = false; $("#alwaysReady").checked = false; }
        showToast(messages[event.error] || `Voice error: ${event.error}`);
    };
    recognition.onend = () => {
        setListening(false);
        if (alwaysReady) window.setTimeout(startRecognition, 500);
    };
}

async function loadLiveNews({ announce = false } = {}) {
    try {
        const response = await fetch(`/api/news?ts=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`API ${response.status}`);
        const payload = await response.json();
        if (!Array.isArray(payload.items)) throw new Error("API_INVALID_PAYLOAD");
        if (payload.items.length) newsData = payload.items;
        liveFeed = Boolean(payload.live && !payload.fallback);
        $("#connectionLabel").textContent = liveFeed ? "LIVE MARKET LINK ONLINE" : "DEMO FALLBACK ACTIVE";
        $("#lastUpdated").textContent = liveFeed ? "LIVE · JUST NOW" : `FALLBACK · ${payload.errorCode || "PROVIDER ISSUE"}`;
        renderNews();
        const newHighImpact = newsData.filter((item) => item.impact === "HIGH" && !knownHighImpactIds.has(item.id));
        newHighImpact.forEach((item) => knownHighImpactIds.add(item.id));
        if (announce && newHighImpact.length) {
            const alert = `Nayi high impact khabar: ${newHighImpact[0].title}`;
            showToast(alert); if (alwaysReady) speak(alert);
        } else if (announce) showToast(payload.message || "Market intelligence feed updated.");
        if (!liveFeed && payload.errorCode) console.warn("ROOBOT feed fallback:", payload.errorCode, payload.message);
    } catch (error) {
        liveFeed = false;
        $("#connectionLabel").textContent = "API OFFLINE · DEMO ACTIVE";
        $("#lastUpdated").textContent = "OFFLINE FALLBACK";
        console.error("ROOBOT news feed error:", error);
        if (announce) showToast("Live API unavailable — demo feed active hai.");
    }
}

function refreshFeed() {
    const button = $("#refreshButton");
    button.disabled = true;
    button.style.opacity = ".5";
    loadLiveNews({ announce: true }).finally(() => { button.disabled = false; button.style.opacity = "1"; });
}

$("#assetTabs").addEventListener("click", (event) => {
    const tab = event.target.closest("button");
    if (!tab) return;
    if (tab.dataset.asset) {
        selectedAsset = tab.dataset.asset;
        $("#searchInput").value = "";
        updateTabs();
    } else if (tab.dataset.topic) {
        document.querySelectorAll("#assetTabs button").forEach((item) => item.classList.toggle("active", item === tab));
        $("#searchInput").value = tab.dataset.topic;
        renderNews();
        showToast(`${tab.dataset.topic} intelligence filter active hai.`);
    }
});
$("#searchInput").addEventListener("input", renderNews);
$("#refreshButton").addEventListener("click", refreshFeed);
$("#listenButton").addEventListener("click", () => isListening ? stopRecognition() : startRecognition());
$("#floatingMic").addEventListener("click", () => isListening ? stopRecognition() : startRecognition());
document.querySelectorAll("[data-command]").forEach((button) => button.addEventListener("click", () => runCommand(button.dataset.command)));
document.querySelectorAll("[data-page]").forEach((button) => button.addEventListener("click", () => navigateTo(button.dataset.page)));
$("#menuButton").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
$("#marketAsset").addEventListener("change", (event) => updateMarketAsset(event.target.value));
$("#alwaysReady").addEventListener("change", (event) => {
    alwaysReady = event.target.checked;
    if (alwaysReady) { startRecognition(); showToast("Always Ready mode active hai."); }
    else { stopRecognition(); showToast("Always Ready mode band kar diya."); }
});
$("#briefButton").addEventListener("click", () => { speak($("#briefText").textContent); showToast("Market brief play ho raha hai."); });
$("#pauseResponse").addEventListener("click", () => {
    if (!("speechSynthesis" in window)) return;
    if (window.speechSynthesis.paused) { window.speechSynthesis.resume(); showToast("Robot response resume ho raha hai."); }
    else { window.speechSynthesis.pause(); showToast("Robot response pause kar diya hai."); }
});
$("#stopResponse").addEventListener("click", () => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setRobotState("standby");
    showToast("Robot response stop kar diya hai.");
});
$("#clearTranscript").addEventListener("click", () => { $("#transcript").textContent = "“  Aap mujh se pooch sakte hain: Bitcoin ki latest khabar kya hai?  ”"; });
$("#settingsButton").addEventListener("click", () => showToast("Voice: Urdu PK · Auto-scan: ready · Alerts: high impact"));
document.addEventListener("keydown", (event) => {
    if (event.code === "Space" && document.activeElement.tagName !== "INPUT") { event.preventDefault(); isListening ? stopRecognition() : startRecognition(); }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); $("#searchInput").focus(); }
});
function updateClock() { $("#clock").textContent = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date()) + " PKT"; }
if ("speechSynthesis" in window) window.speechSynthesis.onvoiceschanged = chooseFemaleVoice;
setRobotState("standby"); setupRecognition(); renderNews(); updateClock(); loadLiveNews(); loadIntelligence(); loadMarketData();
window.setInterval(updateClock, 1000);
window.setInterval(() => loadLiveNews({ announce: true }), 5 * 60 * 1000);
window.setInterval(() => loadMarketData(), 60 * 1000);
