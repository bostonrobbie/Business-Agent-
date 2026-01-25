
import { OllamaLLM } from '../llm';
import { MemoryStore } from './memory';
import { DB } from '../db';

export interface Opportunity {
    id: string;
    title: string;
    description: string;
    marketLeverage: string;
    ownerFriction: string; // High/Med/Low
    suggestedAction: string;
}

export class Scout {
    private llm: OllamaLLM;

    constructor() {
        this.llm = new OllamaLLM();
    }

    /**
     * Periodically scouts for opportunities based on recent business state.
     */
    public async scoutOpportunities(projectId: number): Promise<Opportunity[]> {
        // Fetch recent memories and snapshots
        const timeline = await MemoryStore.getTimeline(projectId, 10);

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
        const { Intercom } = await import('./intercom');
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
        } catch (e) {
            console.error('Failed to parse scout opportunities:', e);
        }
        return [];
    }
}
