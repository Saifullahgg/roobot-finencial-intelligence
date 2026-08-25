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
let liveFeed = false;

function escapeHtml(value = "") {
    return String(value).replace(/[&<>]/g, (character) => {
        if (character === "&") return "&";
        if (character === "<") return "<";
        return ">";
    });
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

function speak(text) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ur-PK";
    utterance.rate = 0.94;
    window.speechSynthesis.speak(utterance);
}

function setListening(nextState) {
    isListening = nextState;
    $("#listenButton").classList.toggle("listening", nextState);
    $("#listenLabel").textContent = nextState ? "MAIN SUN RAHA HUN..." : "SUN'NA SHURU KAREIN";
    $("#faceMode").textContent = nextState ? "LISTENING" : "STANDBY";
    $("#scanLabel").textContent = nextState ? "ACTIVE" : "PAUSED";
    $("#transcriptStatus").textContent = nextState ? "Aap bol sakte hain..." : "Aapki awaaz ka intezar hai...";
}

function respondToCommand(rawText) {
    const text = rawText.toLowerCase();
    let reply = "Command samajh nahi aaya. Aap market brief ya high impact news pooch sakte hain.";
    if (text.includes("bitcoin") || text.includes("btc") || text.includes("crypto")) {
        selectedAsset = "CRYPTO"; updateTabs(); reply = "Bitcoin resistance ke qareeb hai aur ETF flows important signal de rahe hain. Main crypto feed dikha raha hun.";
    } else if (text.includes("stock") || text.includes("shares") || text.includes("nasdaq")) {
        selectedAsset = "STOCKS"; updateTabs(); reply = "US futures green hain aur tech stocks mein recovery nazar aa rahi hai. Stocks feed khol diya hai.";
    } else if (text.includes("forex") || text.includes("dollar") || text.includes("currency")) {
        selectedAsset = "FOREX"; updateTabs(); reply = "Dollar index strong hai aur CPI se pehle forex volatility barh sakti hai. Forex feed dikha raha hun.";
    } else if (text.includes("high impact") || text.includes("important") || text.includes("aham") || text.includes("impact")) {
        reply = "Aaj ke high impact events US CPI aur Fed Chair speech hain. BTC ETF flows bhi watch list par hain.";
    } else if (text.includes("brief") || text.includes("summary") || text.includes("khulasah")) {
        reply = $("#briefText").textContent;
    } else if (text.includes("refresh") || text.includes("update")) {
        refreshFeed(); reply = "News feed refresh kar di hai.";
    }
    $("#transcript").textContent = `“ ${rawText} ”`;
    speak(reply);
    showToast(reply);
}

function updateTabs() {
    document.querySelectorAll(".asset-tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.asset === selectedAsset));
    renderNews();
}

function stopRecognition() {
    if (recognition) recognition.stop();
    setListening(false);
}

function startRecognition() {
    if (!speechSupported) { showToast("Is browser mein voice recognition supported nahi hai."); return; }
    try { recognition.start(); } catch (error) { /* already running */ }
}

function setupRecognition() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { $("#connectionLabel").textContent = "VOICE API UNAVAILABLE"; return; }
    speechSupported = true;
    recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "ur-PK";
    recognition.onstart = () => setListening(true);
    recognition.onresult = (event) => {
        const result = event.results[event.results.length - 1];
        const text = result[0].transcript;
        $("#transcript").textContent = `“ ${text} ”`;
        if (result.isFinal) respondToCommand(text);
    };
    recognition.onerror = (event) => {
        if (event.error === "not-allowed") { alwaysReady = false; $("#alwaysReady").checked = false; showToast("Microphone permission allow karna zaroori hai."); }
    };
    recognition.onend = () => {
        setListening(false);
        if (alwaysReady) window.setTimeout(startRecognition, 500);
    };
}

async function loadLiveNews({ announce = false } = {}) {
    try {
        const response = await fetch("/api/news", { cache: "no-store" });
        if (!response.ok) throw new Error(`API ${response.status}`);
        const payload = await response.json();
        if (Array.isArray(payload.items) && payload.items.length) newsData = payload.items;
        liveFeed = Boolean(payload.live);
        $("#connectionLabel").textContent = liveFeed ? "LIVE MARKET LINK ONLINE" : "DEMO FALLBACK ACTIVE";
        $("#lastUpdated").textContent = liveFeed ? "LIVE · JUST NOW" : "FALLBACK · JUST NOW";
        renderNews();
        const newHighImpact = newsData.filter((item) => item.impact === "HIGH" && !knownHighImpactIds.has(item.id));
        newHighImpact.forEach((item) => knownHighImpactIds.add(item.id));
        if (announce && newHighImpact.length) {
            const alert = `Nayi high impact khabar: ${newHighImpact[0].title}`;
            showToast(alert); if (alwaysReady) speak(alert);
        } else if (announce) showToast(payload.message || "Market intelligence feed updated.");
    } catch (error) {
        liveFeed = false;
        $("#connectionLabel").textContent = "API OFFLINE · DEMO ACTIVE";
        $("#lastUpdated").textContent = "OFFLINE FALLBACK";
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
    const tab = event.target.closest(".asset-tab");
    if (!tab) return;
    selectedAsset = tab.dataset.asset; updateTabs();
});
$("#searchInput").addEventListener("input", renderNews);
$("#refreshButton").addEventListener("click", refreshFeed);
$("#listenButton").addEventListener("click", () => isListening ? stopRecognition() : startRecognition());
$("#alwaysReady").addEventListener("change", (event) => {
    alwaysReady = event.target.checked;
    if (alwaysReady) { startRecognition(); showToast("Always Ready mode active hai."); }
    else { stopRecognition(); showToast("Always Ready mode band kar diya."); }
});
$("#briefButton").addEventListener("click", () => { speak($("#briefText").textContent); showToast("Market brief play ho raha hai."); });
$("#clearTranscript").addEventListener("click", () => { $("#transcript").textContent = "“  Aap mujh se pooch sakte hain: Bitcoin ki latest khabar kya hai?  ”"; });
$("#settingsButton").addEventListener("click", () => showToast("Voice: Urdu PK · Auto-scan: ready · Alerts: high impact"));
document.addEventListener("keydown", (event) => {
    if (event.code === "Space" && document.activeElement.tagName !== "INPUT") { event.preventDefault(); isListening ? stopRecognition() : startRecognition(); }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); $("#searchInput").focus(); }
});
function updateClock() { $("#clock").textContent = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date()) + " PKT"; }
setupRecognition(); renderNews(); updateClock(); loadLiveNews();
window.setInterval(updateClock, 1000);
window.setInterval(() => loadLiveNews({ announce: true }), 5 * 60 * 1000);
