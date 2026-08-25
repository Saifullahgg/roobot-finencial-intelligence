const { getNews } = require("../lib/news");

module.exports = async function handler(request, response) {
    const data = await getNews(process.env.GNEWS_API_KEY);
    response.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=60");
    response.setHeader("Access-Control-Allow-Origin", "*");
    return response.status(200).json(data);
};
