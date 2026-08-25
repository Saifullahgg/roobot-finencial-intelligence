const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");
const { getNews } = require("./lib/news");

loadEnvFile();
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;

function loadEnvFile() {
    const envPath = path.join(__dirname, ".env");
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*["']?([^"']*)["']?\s*$/);
        if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
    }
}

function sendJson(response, status, body) {
    response.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*"
    });
    response.end(JSON.stringify(body));
}

const server = http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    if (requestUrl.pathname === "/api/news") return sendJson(response, 200, await getNews(process.env.GNEWS_API_KEY));
    if (requestUrl.pathname === "/api/health") return sendJson(response, 200, {
        ok: true,
        liveProvider: Boolean(process.env.GNEWS_API_KEY),
        cached: false
    });

    const requested = requestUrl.pathname === "/" ? "index.html" : requestUrl.pathname.slice(1);
    const filePath = path.resolve(ROOT, requested);
    if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return sendJson(response, 404, { error: "Not found" });
    const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript" };
    response.writeHead(200, { "Content-Type": types[path.extname(filePath)] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(response);
});

server.listen(PORT, () => console.log(`R.O.O.B.O.T. running at http://localhost:${PORT} — ${process.env.GNEWS_API_KEY ? "live provider configured" : "demo fallback"}`));
