"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentResponseSchema = exports.GrowthResponseSchema = exports.EngineeringResponseSchema = exports.ProductResponseSchema = exports.CEOResponseSchema = exports.DelegatedTaskSchema = exports.RiskLevelSchema = void 0;
const zod_1 = require("zod");
exports.RiskLevelSchema = zod_1.z.enum(['SAFE', 'REVIEW', 'BLOCKED']);
// Generic Task Schema for delegation (CEO)
exports.DelegatedTaskSchema = zod_1.z.object({
    dept: zod_1.z.enum(['product', 'engineering', 'growth', 'ops', 'finance_risk']),
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    risk_level: exports.RiskLevelSchema,
    deliverables: zod_1.z.array(zod_1.z.string()).optional(),
    payload: zod_1.z.any().optional()
});
exports.CEOResponseSchema = zod_1.z.object({
    analysis: zod_1.z.string(),
    strategy: zod_1.z.string(),
    tasks: zod_1.z.array(exports.DelegatedTaskSchema),
    kpis: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        value: zod_1.z.number(),
        unit: zod_1.z.string().optional()
    })).optional()
});
// Product Schema
exports.ProductResponseSchema = zod_1.z.object({
    offer: zod_1.z.object({
        title: zod_1.z.string(),
        description: zod_1.z.string(),
        pricing_model: zod_1.z.string(),
    }),
    copy: zod_1.z.object({
        headline: zod_1.z.string(),
        subheadline: zod_1.z.string(),
        body: zod_1.z.string(),
        call_to_action: zod_1.z.string()
    }),
    files_to_create: zod_1.z.array(zod_1.z.object({
        path: zod_1.z.string(),
        content: zod_1.z.string()
    })),
    kpis: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        value: zod_1.z.number(),
        unit: zod_1.z.string().optional()
    })).optional()
});
// Engineering Schema
exports.EngineeringResponseSchema = zod_1.z.object({
    plan: zod_1.z.string(),
    files_to_create: zod_1.z.array(zod_1.z.object({
        path: zod_1.z.string(),
        content: zod_1.z.string()
    })),
    commands_to_run: zod_1.z.array(zod_1.z.string()).optional(),
    kpis: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        value: zod_1.z.number(),
        unit: zod_1.z.string().optional()
    })).optional()
});
// Growth Schema
exports.GrowthResponseSchema = zod_1.z.object({
    strategy: zod_1.z.string(),
    outreach_list: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        company: zod_1.z.string(),
        email: zod_1.z.string(),
        role: zod_1.z.string()
    })),
    files_to_create: zod_1.z.array(zod_1.z.object({
        path: zod_1.z.string(),
        content: zod_1.z.string()
    })),
    kpis: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        value: zod_1.z.number(),
        unit: zod_1.z.string().optional()
    })).optional()
});
// Unified Union Schema
exports.AgentResponseSchema = zod_1.z.union([
    exports.CEOResponseSchema,
    exports.ProductResponseSchema,
    exports.EngineeringResponseSchema,
    exports.GrowthResponseSchema
]);
