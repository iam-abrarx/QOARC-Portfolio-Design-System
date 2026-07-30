import { z } from 'zod';
export declare const AssetMetadataSchema: z.ZodObject<{
    hash: z.ZodString;
    filename: z.ZodString;
    path: z.ZodString;
    mimeType: z.ZodOptional<z.ZodString>;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    sizeBytes: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const ProjectManifestSchema: z.ZodObject<{
    $schema: z.ZodOptional<z.ZodString>;
    id: z.ZodString;
    name: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    systems: z.ZodDefault<z.ZodArray<z.ZodString>>;
    documents: z.ZodDefault<z.ZodArray<z.ZodString>>;
    assets: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodObject<{
        hash: z.ZodString;
        filename: z.ZodString;
        path: z.ZodString;
        mimeType: z.ZodOptional<z.ZodString>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        sizeBytes: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export type AssetMetadata = z.infer<typeof AssetMetadataSchema>;
export type ProjectManifest = z.infer<typeof ProjectManifestSchema>;
