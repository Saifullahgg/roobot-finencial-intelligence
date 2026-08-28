const { getIntelligence } = require("../lib/intelligence");

module.exports = function handler(request, response) {
    response.setHeader("Cache-Control", "no-store, max-age=0");
    response.setHeader("Access-Control-Allow-Origin", "*");
    return response.status(200).json(getIntelligence());
};
