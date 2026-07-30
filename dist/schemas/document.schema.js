"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FolioDocumentSchema = exports.SystemRefSchema = exports.PageDimensionsSchema = exports.PageSchema = exports.FolioHeaderFooterSchema = exports.BlockSchema = exports.SlotSchema = exports.SlotScreenSchema = void 0;
const zod_1 = require("zod");
exports.SlotScreenSchema = zod_1.z.object({
    asset: zod_1.z.string().optional(),
    fit: zod_1.z.enum(['cover', 'fit-width', 'auto']).default('cover'),
    transform: zod_1.z.object({
        x: zod_1.z.number().default(0),
        y: zod_1.z.number().default(0),
        z: zod_1.z.number().default(1),
    }).default({ x: 0, y: 0, z: 1 }),
});
exports.SlotSchema = zod_1.z.union([
    zod_1.z.string(),
    exports.SlotScreenSchema,
    zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
]);
exports.BlockSchema = zod_1.z.lazy(() => zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.string(),
    props: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    slots: zod_1.z.record(zod_1.z.string(), exports.SlotSchema).optional(),
    children: zod_1.z.array(exports.BlockSchema).optional(),
}));
exports.FolioHeaderFooterSchema = zod_1.z.object({
    show: zod_1.z.boolean().default(true),
    label: zod_1.z.string().default(''),
});
exports.PageSchema = zod_1.z.object({
    id: zod_1.z.string(),
    master: zod_1.z.string().optional(),
    theme: zod_1.z.string().default('dark'),
    folio: exports.FolioHeaderFooterSchema.optional(),
    blocks: zod_1.z.array(exports.BlockSchema).default([]),
});
exports.PageDimensionsSchema = zod_1.z.object({
    width: zod_1.z.string().default('297mm'),
    height: zod_1.z.string().default('210mm'),
    margin: zod_1.z.string().default('18mm'),
    bleed: zod_1.z.string().default('0mm'),
});
exports.SystemRefSchema = zod_1.z.object({
    ref: zod_1.z.string(),
    version: zod_1.z.string(),
});
exports.FolioDocumentSchema = zod_1.z.object({
    $schema: zod_1.z.string().optional(),
    id: zod_1.z.string(),
    schemaVersion: zod_1.z.number().default(1),
    title: zod_1.z.string(),
    system: exports.SystemRefSchema,
    themeOverrides: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
    page: exports.PageDimensionsSchema.default({ width: '297mm', height: '210mm', margin: '18mm', bleed: '0mm' }),
    pages: zod_1.z.array(exports.PageSchema).default([]),
});
