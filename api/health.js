module.exports = async function handler(request, response) {
    response.setHeader("Cache-Control", "no-store, max-age=0");
    response.setHeader("Access-Control-Allow-Origin", "*");
    return response.status(200).json({
        ok: true,
        liveProvider: Boolean(process.env.GNEWS_API_KEY),
        aiProvider: Boolean(process.env.OPENAI_API_KEY),
        provider: "gnews",
        aiModel: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
        checkedAt: new Date().toISOString()
    });
};
