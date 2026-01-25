"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UniversalProxy = void 0;
const llm_1 = require("../llm");
const registry_1 = require("./registry");
class UniversalProxy {
    llm;
    constructor() {
        this.llm = new llm_1.OllamaLLM();
    }
    /**
     * Route a task to the most appropriate subsystem or agent.
     */
    async routeTask(taskDescription) {
        const titles = registry_1.DigitalOrgRegistry.getAllTitles().map(t => `${t.title} (${t.dept})`).join(', ');
        const prompt = `
You are the Universal Proxy for an Autonomous Business Unit. 
Your job is to route the following task to the correct handler.

Task: ${taskDescription}

Available Intents:
1. RESEARCH: Information gathering, market analysis, data lookups.
2. CODE: Software engineering, script writing, technical implementation.
3. STRATEGY: Business planning, vision synthesis, multiplexing.
4. EXECUTION: Direct actions, artifact generation, polishing.
5. HUMAN_INTERVENTION: Requires high-level owner decision (Low Love Equation score).

Available Handlers:
${titles}

Return a JSON object with:
{
  "intent": "INTENT_NAME",
  "handler": "Exact title from handlers list",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation"
}
`;
        const response = await this.llm.generate(prompt);
        try {
            // Find JSON in the response
            const match = response.content.match(/\{[\s\S]*\}/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                return {
                    intent: parsed.intent,
                    handler: parsed.handler,
                    confidence: parsed.confidence
                };
            }
        }
        catch (e) {
            console.error('Failed to parse proxy route:', e);
        }
        return {
            intent: 'STRATEGY', // Default to strategy if parsing fails
            handler: 'CEO',
            confidence: 0.5
        };
    }
}
exports.UniversalProxy = UniversalProxy;
