"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolSystem = void 0;
const axios_1 = __importDefault(require("axios"));
class ToolSystem {
    static async execute(toolName, args, logger) {
        await logger.log('INFO', `🔧 Executing Tool: ${toolName} with args: ${JSON.stringify(args)}`);
        try {
            if (toolName === 'web_search') {
                return await this.webSearch(args.query);
            }
            else if (toolName === 'browser_scrape') {
                return await this.browserScrape(args.url);
            }
            else {
                return `Error: Tool ${toolName} not found.`;
            }
        }
        catch (error) {
            return `Error executing tool ${toolName}: ${error.message}`;
        }
    }
    static async webSearch(query) {
        // In a real private appliance, this might call a local SearXNG or a privacy-first API
        // For v1, we simulate a robust response or use a simple API if configured.
        return `Search results for "${query}": [Evidence Sample] Found 3 market competitors and 2 new tech trends. Competitor X just released a public API.`;
    }
    static async browserScrape(url) {
        // Simple fetch and text extraction
        try {
            const response = await axios_1.default.get(url, { timeout: 5000 });
            const text = response.data.toString().replace(/<[^>]*>?/gm, ' ').substring(0, 2000);
            return `Scraped content from ${url}: ${text}`;
        }
        catch (e) {
            return `Failed to scrape ${url}: ${e.message}`;
        }
    }
}
exports.ToolSystem = ToolSystem;
