const MARKET_CACHE_TTL = 60_000;

let cache = { expires: 0, data: null };

const COINPAPRIKA_IDS = ["btc-bitcoin", "eth-ethereum", "sol-solana", "xrp-xrp", "bnb-binance-coin", "ada-cardano", "doge-dogecoin", "dot-polkadot"];
const COIN_META = {
    "btc-bitcoin": { symbol: "BTC", name: "Bitcoin" },
    "eth-ethereum": { symbol: "ETH", name: "Ethereum" },
    "sol-solana": { symbol: "SOL", name: "Solana" },
    "xrp-xrp": { symbol: "XRP", name: "XRP" },
    "bnb-binance-coin": { symbol: "BNB", name: "BNB" },
    "ada-cardano": { symbol: "ADA", name: "Cardano" },
    "doge-dogecoin": { symbol: "DOGE", name: "Dogecoin" },
    "dot-polkadot": { symbol: "DOT", name: "Polkadot" }
};

const FOREX_PAIRS = [
    { from: "USD", to: "PKR", label: "USD/PKR" },
    { from: "EUR", to: "PKR", label: "EUR/PKR" },
    { from: "GBP", to: "PKR", label: "GBP/PKR" },
    { from: "USD", to: "EUR", label: "EUR/USD" },
    { from: "USD", to: "GBP", label: "GBP/USD" },
    { from: "USD", to: "JPY", label: "USD/JPY" }
];

const STOCK_DEMO = [
    { symbol: "AAPL", name: "Apple", price: "189.84", change: "+1.24%", volume: "52.1M" },
    { symbol: "GOOGL", name: "Alphabet", price: "175.20", change: "-0.56%", volume: "31.4M" },
    { symbol: "MSFT", name: "Microsoft", price: "420.50", change: "+2.10%", volume: "28.7M" },
    { symbol: "NVDA", name: "NVIDIA", price: "128.30", change: "+0.85%", volume: "45.2M" },
    { symbol: "TSLA", name: "Tesla", price: "245.60", change: "-1.42%", volume: "38.9M" }
];

async function fetchCrypto() {
    const url = "https://api.coinpaprika.com/v1/tickers?quotes=USD&limit=100";
    const response = await fetch(url);
    if (!response.ok) throw new Error(`CoinPaprika ${response.status}`);
    const data = await response.json();
    const wanted = new Set(COINPAPRIKA_IDS);
    const filtered = data.filter((coin) => wanted.has(coin.id));
    return filtered.map((coin) => {
        const meta = COIN_META[coin.id] || { symbol: (coin.symbol || "").toUpperCase(), name: coin.name };
        const quotes = coin.quotes?.USD || {};
        return {
            id: coin.id,
            symbol: meta.symbol,
            name: meta.name,
            price: quotes.price ? Number(quotes.price.toFixed(2)) : null,
            change24h: quotes.percent_change_24h ? Number(quotes.percent_change_24h.toFixed(2)) : null,
            marketCap: quotes.market_cap ? Number(quotes.market_cap.toFixed(0)) : null,
            volume24h: quotes.volume_24h ? Number(quotes.volume_24h.toFixed(0)) : null,
            lastUpdated: new Date().toISOString()
        };
    });
}

async function fetchForex() {
    const url = "https://api.exchangerate-api.com/v4/latest/USD";
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Forex ${response.status}`);
    const data = await response.json();
    return FOREX_PAIRS.map((pair) => {
        const rate = data.rates[pair.to];
        return {
            pair: pair.label,
            rate: rate ? Number(rate.toFixed(4)) : null,
            from: pair.from,
            to: pair.to
        };
    });
}

async function fetchMarketData() {
    if (cache.data && cache.expires > Date.now()) return cache.data;

    const result = {
        generatedAt: new Date().toISOString(),
        crypto: [],
        forex: [],
        stocks: {
            available: false,
            message: "Live stock data requires a market data API key. Demo values shown.",
            items: STOCK_DEMO
        },
        summary: {
            btcDominance: null,
            marketSentiment: "NEUTRAL"
        }
    };

    try {
        const coins = await fetchCrypto();
        result.crypto = coins.length ? coins : result.crypto;

        if (result.crypto.length && result.crypto[0].marketCap) {
            const totalMc = result.crypto.reduce((sum, c) => sum + (c.marketCap || 0), 0);
            const btcMc = result.crypto[0].marketCap || 0;
            result.summary.btcDominance = totalMc > 0 ? Number(((btcMc / totalMc) * 100).toFixed(1)) : null;
        }

        const positiveCount = result.crypto.filter((c) => c.change24h > 0).length;
        if (positiveCount > result.crypto.length / 2) result.summary.marketSentiment = "BULLISH";
        else if (positiveCount < result.crypto.length / 3) result.summary.marketSentiment = "BEARISH";
    } catch (error) {
        console.error("Crypto market data error:", error.message);
        result.cryptoError = error.message;
    }

    try {
        result.forex = await fetchForex();
    } catch (error) {
        console.error("Forex market data error:", error.message);
        result.forexError = error.message;
    }

    cache = { data: result, expires: Date.now() + MARKET_CACHE_TTL };
    return result;
}

module.exports = { fetchMarketData };
