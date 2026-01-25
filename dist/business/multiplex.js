"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Multiplexer = void 0;
const llm_1 = require("../llm");
const registry_1 = require("./registry");
class Multiplexer {
    llm;
    constructor() {
        this.llm = new llm_1.OllamaLLM();
    }
    async synthesizeConsensus(objective, personas) {
        // Resolve personas to full titles
        const resolvedPersonas = personas.map(p => {
            const regTitle = registry_1.DigitalOrgRegistry.getTitle(p.title);
            return {
                ...p,
                details: regTitle || {
                    title: p.title,
                    dept: 'General',
                    description: 'Specialist agent',
                    bias: 'Generalist',
                    heuristics: [],
                    hardwareProfile: { temperature: 0.2 }
                }
            };
        });
        // Parallel reasoning
        const responses = await Promise.all(resolvedPersonas.map(p => this.reasonAs(objective, p)));
        // Synthesize as CEO
        const ceoDetails = registry_1.DigitalOrgRegistry.getTitle('CEO');
        const synthesisPrompt = `
Objective: ${objective}

We have divergent reasoning from ${resolvedPersonas.length} specialist agents:
${responses.map((r, i) => `[${resolvedPersonas[i].name} - ${resolvedPersonas[i].details.title}]: ${r}`).join('\n\n')}

As the CEO Synthesis Engine, synthesize the final, most robust consensus business plan. 
Prioritize "The Last Mile" (actionable execution) while balancing the divergent biases and adhering to the core business heuristics.
`;
        const response = await this.llm.generate(synthesisPrompt, {
            ...ceoDetails.hardwareProfile,
            isDeepTruth: ceoDetails.isDeepTruthEnabled
        });
        return response.content;
    }
    async reasonAs(objective, persona) {
        const details = persona.details;
        const prompt = `You are ${persona.name}, the ${details.title} of this Autonomous Business Unit.
Your Department: ${details.dept}
Your Bias: ${details.bias}
Core Heuristics:
${details.heuristics.map(h => `- ${h}`).join('\n')}

Objective: ${objective}

Reason through this objective from your specific professional perspective. 
YOU MUST INCLUDE A <thought> BLOCK STARTING YOUR RESPONSE TO SHOW YOUR INTERNAL REASONING.
Limit your response to 1 concise paragraph focused on your specialization and how to achieve "The Last Mile" for this task.`;
        const response = await this.llm.generate(prompt, {
            ...details.hardwareProfile,
            isDeepTruth: details.isDeepTruthEnabled
        });
        return response.content;
    }
}
exports.Multiplexer = Multiplexer;
