const MAX_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 1200;

function json(response, status, body) {
    response.setHeader("Cache-Control", "no-store, max-age=0");
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    return response.status(status).json(body);
}

function cleanMessages(messages) {
    if (!Array.isArray(messages)) return [];
    return messages
        .filter((message) => message && ["user", "assistant"].includes(message.role))
        .slice(-MAX_MESSAGES)
        .map((message) => ({
            role: message.role,
            content: String(message.content || "").slice(0, MAX_MESSAGE_LENGTH)
        }))
        .filter((message) => message.content);
}

async function readBody(request) {
    if (request.body && typeof request.body === "object") return request.body;
    let raw = "";
    for await (const chunk of request) raw += chunk;
    try { return JSON.parse(raw || "{}"); } catch (error) { return {}; }
}

module.exports = async function handler(request, response) {
    if (request.method && request.method !== "POST") {
        return json(response, 405, { error: "Method not allowed" });
    }
    if (!process.env.OPENAI_API_KEY) {
        return json(response, 503, {
            error: "AI_NOT_CONFIGURED",
            message: "OPENAI_API_KEY is not configured on the server."
        });
    }

    const body = await readBody(request);
    const messages = cleanMessages(body.messages);
    if (!messages.length || messages[messages.length - 1].role !== "user") {
        return json(response, 400, { error: "MESSAGE_REQUIRED" });
    }

    const system = [
        "You are ROOBOT, a warm, intelligent financial-market assistant.",
        "Understand Urdu, Roman Urdu, Hindi, and English. Reply in the user's language; default to natural, concise Roman Urdu when the user mixes languages.",
        "Sound human, calm, helpful, and conversational, never robotic or overly formal.",
        "You can discuss general topics, explain concepts, summarize supplied market news, and help with crypto, stocks, forex, macroeconomics, and risk management.",
        "Never claim live prices or breaking news unless it appears in the supplied context. Clearly say when data is unavailable.",
        "Do not give guaranteed returns or personalized financial advice. Mention risk briefly when relevant.",
        "Use short paragraphs and avoid markdown tables. Keep normal answers under 180 words unless the user asks for detail."
    ].join(" ");

    const context = Array.isArray(body.news) ? body.news.slice(0, 10).map((item) => ({
        asset: String(item.asset || ""),
        title: String(item.title || "").slice(0, 300),
        summary: String(item.summary || "").slice(0, 500),
        impact: String(item.impact || "")
    })) : [];

    try {
        const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
                temperature: 0.7,
                max_tokens: 320,
                messages: [
                    { role: "system", content: `${system}\n\nCurrent ROOBOT news context:\n${JSON.stringify(context)}` },
                    ...messages
                ]
            })
        });
        const payload = await upstream.json();
        if (!upstream.ok) {
            return json(response, 502, { error: "AI_PROVIDER_ERROR", message: "AI provider request failed." });
        }
        const reply = payload.choices?.[0]?.message?.content?.trim();
        if (!reply) return json(response, 502, { error: "AI_EMPTY_RESPONSE", message: "AI returned an empty response." });
        return json(response, 200, { reply, model: payload.model || process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini" });
    } catch (error) {
        return json(response, 502, { error: "AI_REQUEST_FAILED", message: "AI provider is temporarily unavailable." });
    }
};
