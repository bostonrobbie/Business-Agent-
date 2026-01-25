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
exports.Polisher = void 0;
const llm_1 = require("../llm");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class Polisher {
    llm;
    constructor() {
        this.llm = new llm_1.OllamaLLM();
    }
    async polishArtifact(filePath, context) {
        if (!fs.existsSync(filePath))
            return;
        const content = fs.readFileSync(filePath, 'utf8');
        const extension = path.extname(filePath);
        const prompt = `
You are the "Universal Proxy" specialized in "The Last Mile" execution.
Your goal is to polish the following file to be professional, execution-ready, and optimized for the owner.

File Path: ${filePath}
Context: ${context}

Original Content:
${content}

Provide the POLISHED version of the content. Maintain the original format (${extension}).
Only return the polished content, nothing else.
`;
        const response = await this.llm.generate(prompt);
        fs.writeFileSync(filePath, response.content);
    }
}
exports.Polisher = Polisher;
