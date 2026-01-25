"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Scout = void 0;
const llm_1 = require("../llm");
const memory_1 = require("./memory");
class Scout {
    llm;
    constructor() {
        this.llm = new llm_1.OllamaLLM();
    }
    /**
     * Periodically scouts for opportunities based on recent business state.
     */
    async scoutOpportunities(projectId) {
        // Fetch recent memories and snapshots
        const timeline = await memory_1.MemoryStore.getTimeline(projectId, 10);
        const prompt = `
You are the Analysis Lead for an Autonomous Business Unit. 
Your goal is to scout for new business opportunities, optimizations, or market pivots using the **SOVEREIGN SIGNAL AUDIT** protocol.

Context (Recent History):
${timeline.map(m => `- ${m.title}: ${m.content}`).join('\n')}

MARKET SIGNAL PROTOCOL (v8):
- You must simulate a real-world pulse check.
- Identify trends from competitors, news, and technology shifts.
- Any opportunity with >8 leverage will trigger the Autonomy Flywheel.

Based on this context, identify 3 proactive opportunities that would:
1. Increase business leverage (The Love Equation).
2. Require minimal owner friction to execute.
3. Align with a "high functioning" business mindset.

Return the result as a JSON array of objects:
{
  "opportunities": [
    {
      "id": "OPT-001",
      "title": "Opportunity Title",
      "description": "Evidence-backed description",
      "marketLeverage": 8, // (1-10 scale)
      "ownerFriction": 2, // (1-10 scale, lower is better)
      "suggestedAction": "First step to take"
    }
  ]
}

YOU MUST INCLUDE A <thought> BLOCK AT THE BEGINNING OF YOUR RESPONSE TO SHOW YOUR INTERNAL REASONING.
Ensure the remainder of your response is valid JSON matching your required schema.
`;
        const response = await this.llm.generate(prompt);
        let content = response.content;
        // Trace & Transparency: Log thoughts for the Analysis Lead
        const { Intercom } = await Promise.resolve().then(() => __importStar(require('./intercom')));
        const thoughtMatch = content.match(/<thought>([\s\S]*?)<\/thought>/);
        if (thoughtMatch) {
            Intercom.logThought('Analysis Lead', thoughtMatch[1]);
            content = content.replace(/<thought>[\s\S]*?<\/thought>/, '').trim();
        }
        try {
            const match = content.match(/\{[\s\S]*\}/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                return parsed.opportunities || [];
            }
        }
        catch (e) {
            console.error('Failed to parse scout opportunities:', e);
        }
        return [];
    }
}
exports.Scout = Scout;
