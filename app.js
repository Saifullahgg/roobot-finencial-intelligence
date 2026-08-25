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
let responseText = "";

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
    $("#voiceTitle").textContent = state === "standby" ? "Tap to Speak" : mode[0] + mode.slice(1).toLowerCase();
    $("#voice").dataset.state = state;
}

function speak(text) {
    responseText = text;
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ur-PK";
    utterance.rate = 0.94;
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

function respondToCommand(rawText) {
    const text = rawText.toLowerCase();
    setRobotState("analyzing");
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
    const values = {
        "BTC / USDT": ["BITCOIN", "$68,427.20", "+2.84%"],
        "ETH / USDT": ["ETHEREUM", "$3,482.00", "+1.72%"],
        "SOL / USDT": ["SOLANA", "$178.41", "-0.63%"]
    };
    const [name, price, change] = values[asset] || values["BTC / USDT"];
    const priceNode = $("#marketPrice");
    const changeNode = priceNode.nextElementSibling;
    priceNode.previousElementSibling.textContent = name;
    priceNode.textContent = price;
    changeNode.childNodes[0].textContent = `${change} `;
    changeNode.classList.toggle("positive", change.startsWith("+"));
    changeNode.classList.toggle("negative", change.startsWith("-"));
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
setRobotState("standby"); setupRecognition(); renderNews(); updateClock(); loadLiveNews();
window.setInterval(updateClock, 1000);
window.setInterval(() => loadLiveNews({ announce: true }), 5 * 60 * 1000);
