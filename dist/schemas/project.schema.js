"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectManifestSchema = exports.AssetMetadataSchema = void 0;
const zod_1 = require("zod");
exports.AssetMetadataSchema = zod_1.z.object({
    hash: zod_1.z.string(),
    filename: zod_1.z.string(),
    path: zod_1.z.string(),
    mimeType: zod_1.z.string().optional(),
    width: zod_1.z.number().optional(),
    height: zod_1.z.number().optional(),
    sizeBytes: zod_1.z.number().optional(),
});
exports.ProjectManifestSchema = zod_1.z.object({
    $schema: zod_1.z.string().optional(),
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    version: zod_1.z.string().default('1.0.0'),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
    systems: zod_1.z.array(zod_1.z.string()).default([]),
    documents: zod_1.z.array(zod_1.z.string()).default([]),
    assets: zod_1.z.record(zod_1.z.string(), exports.AssetMetadataSchema).default({}),
});
