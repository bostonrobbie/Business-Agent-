"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaLLM = void 0;
const config_1 = require("./config");
class OllamaLLM {
    async generate(prompt, options) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), config_1.CONFIG.LLM_TIMEOUT || 300000);
            let systemPrompt = "You are a helpful business agent. Return JSON only when requested.";
            if (options?.isDeepTruth) {
                systemPrompt = `
You are in DEEP TRUTH MODE (Forensic Reasoning Protocol). 
Follow these steps for every response:
1. EPISTEMIC SKEPTICISM: Question assumptions.
2. SOURCE AUDITING: Link claims to primary business documents or data.
3. STEEL-MANNING: Present the strongest counter-argument to your own strategy.
4. OPINION LABELING: Start subjective sentences with [SUBJECTIVE].
5. FALSIFICATION: State what evidence would prove your current plan wrong.
6. THE LAST MILE: Ensure output is 1-click execution ready.
`;
            }
            const response = await fetch(`${config_1.CONFIG.OLLAMA_BASE_URL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: config_1.CONFIG.OLLAMA_MODEL,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: prompt }
                    ],
                    temperature: options?.temperature ?? config_1.CONFIG.LLM_TEMPERATURE,
                    stream: false,
                    options: {
                        num_ctx: options?.num_ctx ?? 8192,
                        num_thread: options?.num_thread,
                        num_gpu: options?.num_gpu
                    }
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                throw new Error(`Ollama Error: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            return {
                content: data.choices[0].message.content
            };
        }
        catch (error) {
            console.error("LLM Generation Failed:", error.message);
            throw error;
        }
    }
}
exports.OllamaLLM = OllamaLLM;
