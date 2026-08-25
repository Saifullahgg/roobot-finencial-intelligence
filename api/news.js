const { getNews } = require("../lib/news");

module.exports = async function handler(request, response) {
    const data = await getNews(process.env.GNEWS_API_KEY);
    response.setHeader("Cache-Control", "no-store, max-age=0");
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("X-Roobot-Feed", data.live ? "live" : "fallback");
    return response.status(200).json(data);
};
