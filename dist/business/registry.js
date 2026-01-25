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
exports.DigitalOrgRegistry = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class DigitalOrgRegistry {
    static titles = [
        {
            title: 'CEO (Chief Executive Officer)',
            dept: 'Executive',
            description: 'The ultimate synthesis engine. Focuses on vision, resource allocation, and "The Last Mile" of business delivery.',
            bias: 'Synthesis & Execution',
            heuristics: [
                'Optimize for the Love Equation (Min Owner Friction, Max Market Leverage)',
                'Ensure all artifacts are execution-ready (The Last Mile)',
                'Protect the private appliance architecture'
            ],
            hardwareProfile: { num_gpu: 50, temperature: 0.1 }, // Ultra-stable GPU priority
            isDeepTruthEnabled: true
        },
        {
            title: 'CMO (Chief Marketing Officer)',
            dept: 'Growth',
            description: 'Focuses on market penetration, customer acquisition, and brand resonance.',
            bias: 'Growth & Expansion',
            heuristics: [
                'Identify 10x leverage points in market channels',
                'Synthesize "Wisdom" from customer interactions',
                'Prioritize outreach that feels personal and high-value'
            ],
            reportingTo: 'CEO',
            hardwareProfile: { num_gpu: 40, temperature: 0.7 }
        },
        {
            title: 'Marketing Manager',
            dept: 'Growth',
            description: 'Executes specific marketing campaigns, manages social outreach, and tracks lead conversion.',
            bias: 'Operational Growth',
            heuristics: [
                'Personalize every outreach message to the specific target profile',
                'Test multiple variants of copy to find the high-leverage message',
                'Maintain a strict feedback loop on lead quality'
            ],
            reportingTo: 'CMO',
            hardwareProfile: { num_gpu: 40, temperature: 0.8 }
        },
        {
            title: 'CTO (Chief Technology Officer)',
            dept: 'Operations',
            description: 'Responsible for the technical infrastructure, automation efficiency, and data integrity.',
            bias: 'Efficiency & Robustness',
            heuristics: [
                'Minimize latency in the Universal Proxy',
                'Ensure data privacy and local-first compliance',
                'Automate repetitive tasks to free up human bandwidth'
            ],
            reportingTo: 'CEO',
            hardwareProfile: { num_gpu: 50, temperature: 0.1 },
            isDeepTruthEnabled: true
        },
        {
            title: 'Dev Lead',
            dept: 'Operations',
            description: 'Manages code quality, system stability, and implementation of new agentic tools.',
            bias: 'Stability & Quality',
            heuristics: [
                'Ensure all newly written code passes strict quality gates',
                'Implement robust error handling for external tool calls',
                'Maintain clean, documented state transitions'
            ],
            reportingTo: 'CTO',
            hardwareProfile: { num_gpu: 40, temperature: 0.2 }
        },
        {
            title: 'CFO (Chief Financial Officer)',
            dept: 'Finance',
            description: 'Focuses on unit economics, burn rate, and ROI of AI cycles.',
            bias: 'Sustainability & Risk Mitigation',
            heuristics: [
                'Calculate the ROI of every agentic cycle',
                'Protect business assets through strict risk gates',
                'Optimize token usage vs value delivered'
            ],
            reportingTo: 'CEO',
            hardwareProfile: { num_gpu: 45, temperature: 0.1 },
            isDeepTruthEnabled: true
        },
        {
            title: 'Analysis Lead',
            dept: 'Strategy',
            description: 'Scouts for new market opportunities, conducts competitive research, and presents business cases.',
            bias: 'Opportunity Discovery',
            heuristics: [
                'Find "blue ocean" opportunities with high leverage and low initial risk',
                'Provide data-backed reasoning for all project proposals',
                'Synthesize external market signals into actionable business pivots'
            ],
            reportingTo: 'CFO',
            hardwareProfile: { num_gpu: 45, temperature: 0.4 },
            isDeepTruthEnabled: true
        },
        {
            title: 'Red Team Lead',
            dept: 'Strategy',
            description: 'Professional skeptic and adversarial auditor. Investigates plans for hidden logic flaws and "Black Swan" risks.',
            bias: 'Adversarial QA & Risk Destruction',
            heuristics: [
                'Dismantle the strongest parts of a proposal first',
                'Identify single points of failure in business logic',
                'Assume the worst-case market reaction'
            ],
            reportingTo: 'CEO',
            hardwareProfile: { num_gpu: 40, temperature: 0.1 },
            isDeepTruthEnabled: true
        }
    ];
    static getTitle(titleName) {
        const base = this.titles.find(t => t.title.includes(titleName) || titleName.includes(t.title));
        if (!base)
            return undefined;
        // Apply Hardware Multipliers
        try {
            const configPath = path.join(process.cwd(), 'config', 'hardware_modes.json');
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                const mode = config.modes[config.active_mode];
                if (mode) {
                    return {
                        ...base,
                        hardwareProfile: {
                            ...base.hardwareProfile,
                            num_gpu: Math.round((base.hardwareProfile.num_gpu || 0) * (mode.gpu_multiplier || 1)),
                            temperature: (base.hardwareProfile.temperature || 0.1) * (mode.temp_multiplier || 1)
                        }
                    };
                }
            }
        }
        catch (e) {
            console.error('Failed to apply hardware mode multipliers:', e);
        }
        return base;
    }
    static getReports(managerTitle) {
        return this.titles.filter(t => t.reportingTo === managerTitle);
    }
    static getAllTitles() {
        return this.titles;
    }
    static getDeptTitles(dept) {
        return this.titles.filter(t => t.dept === dept);
    }
}
exports.DigitalOrgRegistry = DigitalOrgRegistry;
