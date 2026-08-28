const DAY = 24 * 60 * 60 * 1000;

function nextUtcDate(dayOffset, hour, minute = 0) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + dayOffset);
    date.setUTCHours(hour, minute, 0, 0);
    if (date.getTime() <= Date.now()) date.setUTCDate(date.getUTCDate() + 1);
    return date.toISOString();
}

const upcomingEvents = [
    {
        id: "macro-us-cpi",
        type: "MACRO",
        title: "US CPI Inflation Release",
        scheduledAt: nextUtcDate(1, 12, 30),
        impactScore: 92,
        confidence: 96,
        status: "SCHEDULED",
        affectedAssets: ["DXY", "GOLD", "BTC", "NASDAQ", "EUR/USD"],
        baseCase: "Agar inflation consensus se zyada aaye to dollar aur yields strong, jabke gold, BTC aur growth stocks pressure mein aa sakte hain.",
        alternateCase: "Soft CPI rate-cut expectations ko support karke risk assets ko positive reaction de sakta hai.",
        source: "Official economic calendar demo",
        sourceUrl: "https://www.bls.gov/cpi/"
    },
    {
        id: "macro-fed-speech",
        type: "CENTRAL_BANK",
        title: "Federal Reserve Policy Speech",
        scheduledAt: nextUtcDate(2, 16, 0),
        impactScore: 78,
        confidence: 86,
        status: "SCHEDULED",
        affectedAssets: ["DXY", "US10Y", "GOLD", "BTC", "S&P 500"],
        baseCase: "Hawkish comments interest-rate expectations aur dollar ko support kar sakte hain.",
        alternateCase: "Dovish signal equities, crypto aur gold ke liye supportive ho sakta hai.",
        source: "Federal Reserve demo calendar",
        sourceUrl: "https://www.federalreserve.gov/newsevents/calendar.htm"
    },
    {
        id: "derivatives-expiry",
        type: "DERIVATIVES",
        title: "Major Crypto Options Expiry",
        scheduledAt: nextUtcDate(3, 8, 0),
        impactScore: 67,
        confidence: 73,
        status: "WATCH",
        affectedAssets: ["BTC", "ETH", "CRYPTO VOLATILITY"],
        baseCase: "Large options expiry ke qareeb short-term volatility aur price pinning barh sakti hai.",
        alternateCase: "Agar open interest smoothly roll ho jaye to expiry ka asar limited reh sakta hai.",
        source: "ROOBOT derivatives demo monitor",
        sourceUrl: ""
    }
];

const airdrops = [
    {
        id: "airdrop-l2-points",
        project: "Layer-2 Points Campaign",
        chain: "Ethereum L2",
        status: "LIKELY",
        confidence: 72,
        opportunityScore: 68,
        risk: "MEDIUM",
        deadline: new Date(Date.now() + 14 * DAY).toISOString(),
        requirement: "Official ecosystem activity aur points collection; token abhi confirm nahi.",
        safety: "Sirf official project domain istemal karein; seed phrase kabhi share na karein.",
        source: "ROOBOT verified-demo registry",
        sourceUrl: ""
    },
    {
        id: "airdrop-testnet-watch",
        project: "Modular Testnet Watch",
        chain: "Testnet",
        status: "SPECULATIVE",
        confidence: 48,
        opportunityScore: 43,
        risk: "HIGH",
        deadline: new Date(Date.now() + 30 * DAY).toISOString(),
        requirement: "Testnet participation; kisi reward ki official guarantee nahi.",
        safety: "Burner wallet use karein aur unknown token approvals sign na karein.",
        source: "Community signal — unverified demo",
        sourceUrl: ""
    },
    {
        id: "airdrop-claim-safety",
        project: "Verified Claim Safety Monitor",
        chain: "Multi-chain",
        status: "CLAIM_LIVE",
        confidence: 91,
        opportunityScore: 76,
        risk: "LOW",
        deadline: new Date(Date.now() + 7 * DAY).toISOString(),
        requirement: "Eligibility official checker se verify karni hogi.",
        safety: "Claim URL ko project ke official announcement se cross-check karein.",
        source: "ROOBOT safety demo",
        sourceUrl: ""
    }
];

function getIntelligence() {
    return {
        generatedAt: new Date().toISOString(),
        timezone: "Asia/Karachi",
        mode: "MVP_DEMO",
        disclaimer: "Ye intelligence hai, financial advice ya guaranteed prediction nahi.",
        events: upcomingEvents,
        airdrops,
        stats: {
            criticalEvents: upcomingEvents.filter((event) => event.impactScore >= 80).length,
            upcomingEvents: upcomingEvents.length,
            trackedAirdrops: airdrops.length,
            verifiedSignals: airdrops.filter((item) => item.confidence >= 70).length
        }
    };
}

module.exports = { getIntelligence };
