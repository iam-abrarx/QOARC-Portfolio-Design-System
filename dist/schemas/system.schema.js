"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesignSystemSchema = exports.RuleSchema = exports.ThemeSchema = exports.TokensSchema = exports.TokenScaleSchema = exports.TokenFontSchema = exports.TokenColorSchema = void 0;
const zod_1 = require("zod");
exports.TokenColorSchema = zod_1.z.object({
    $type: zod_1.z.literal('color'),
    $value: zod_1.z.string(),
    $extensions: zod_1.z.object({
        'folio.derive': zod_1.z.array(zod_1.z.string()).optional(),
    }).optional(),
});
exports.TokenFontSchema = zod_1.z.object({
    $type: zod_1.z.literal('fontFamily'),
    $value: zod_1.z.array(zod_1.z.string()),
    $extensions: zod_1.z.object({
        'folio.variation': zod_1.z.record(zod_1.z.string(), zod_1.z.number()).optional(),
    }).optional(),
});
exports.TokenScaleSchema = zod_1.z.object({
    $type: zod_1.z.literal('scale').or(zod_1.z.literal('other')),
    $value: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
});
exports.TokensSchema = zod_1.z.object({
    color: zod_1.z.record(zod_1.z.string(), exports.TokenColorSchema),
    font: zod_1.z.record(zod_1.z.string(), exports.TokenFontSchema),
    scale: zod_1.z.record(zod_1.z.string(), exports.TokenScaleSchema).optional(),
});
exports.ThemeSchema = zod_1.z.record(zod_1.z.string(), zod_1.z.string());
exports.RuleSchema = zod_1.z.object({
    id: zod_1.z.string(),
    severity: zod_1.z.enum(['error', 'warn', 'info']),
    description: zod_1.z.string().optional(),
    check: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
});
exports.DesignSystemSchema = zod_1.z.object({
    $schema: zod_1.z.string().optional(),
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    version: zod_1.z.string(),
    tokens: exports.TokensSchema,
    themes: zod_1.z.record(zod_1.z.string(), exports.ThemeSchema),
    rules: zod_1.z.array(exports.RuleSchema).default([]),
});
