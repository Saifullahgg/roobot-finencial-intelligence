const { fetchMarketData } = require("../lib/market");

module.exports = async function handler(request, response) {
    try {
        const data = await fetchMarketData();
        response.setHeader("Cache-Control", "no-store, max-age=0");
        response.setHeader("Access-Control-Allow-Origin", "*");
        return response.status(200).json(data);
    } catch (error) {
        console.error("Market API error:", error);
        return response.status(500).json({ error: "Market data unavailable", fallback: true });
    }
};
