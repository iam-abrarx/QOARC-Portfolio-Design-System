import { z } from 'zod';
export declare const SlotScreenSchema: z.ZodObject<{
    asset: z.ZodOptional<z.ZodString>;
    fit: z.ZodDefault<z.ZodEnum<{
        cover: "cover";
        "fit-width": "fit-width";
        auto: "auto";
    }>>;
    transform: z.ZodDefault<z.ZodObject<{
        x: z.ZodDefault<z.ZodNumber>;
        y: z.ZodDefault<z.ZodNumber>;
        z: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const SlotSchema: z.ZodUnion<readonly [z.ZodString, z.ZodObject<{
    asset: z.ZodOptional<z.ZodString>;
    fit: z.ZodDefault<z.ZodEnum<{
        cover: "cover";
        "fit-width": "fit-width";
        auto: "auto";
    }>>;
    transform: z.ZodDefault<z.ZodObject<{
        x: z.ZodDefault<z.ZodNumber>;
        y: z.ZodDefault<z.ZodNumber>;
        z: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodRecord<z.ZodString, z.ZodAny>]>;
export type Block = {
    id: string;
    type: string;
    props?: Record<string, any>;
    slots?: Record<string, z.infer<typeof SlotSchema>>;
    children?: Block[];
};
export declare const BlockSchema: z.ZodType<Block>;
export declare const FolioHeaderFooterSchema: z.ZodObject<{
    show: z.ZodDefault<z.ZodBoolean>;
    label: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export declare const PageSchema: z.ZodObject<{
    id: z.ZodString;
    master: z.ZodOptional<z.ZodString>;
    theme: z.ZodDefault<z.ZodString>;
    folio: z.ZodOptional<z.ZodObject<{
        show: z.ZodDefault<z.ZodBoolean>;
        label: z.ZodDefault<z.ZodString>;
    }, z.core.$strip>>;
    blocks: z.ZodDefault<z.ZodArray<z.ZodType<Block, unknown, z.core.$ZodTypeInternals<Block, unknown>>>>;
}, z.core.$strip>;
export declare const PageDimensionsSchema: z.ZodObject<{
    width: z.ZodDefault<z.ZodString>;
    height: z.ZodDefault<z.ZodString>;
    margin: z.ZodDefault<z.ZodString>;
    bleed: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export declare const SystemRefSchema: z.ZodObject<{
    ref: z.ZodString;
    version: z.ZodString;
}, z.core.$strip>;
export declare const FolioDocumentSchema: z.ZodObject<{
    $schema: z.ZodOptional<z.ZodString>;
    id: z.ZodString;
    schemaVersion: z.ZodDefault<z.ZodNumber>;
    title: z.ZodString;
    system: z.ZodObject<{
        ref: z.ZodString;
        version: z.ZodString;
    }, z.core.$strip>;
    themeOverrides: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    page: z.ZodDefault<z.ZodObject<{
        width: z.ZodDefault<z.ZodString>;
        height: z.ZodDefault<z.ZodString>;
        margin: z.ZodDefault<z.ZodString>;
        bleed: z.ZodDefault<z.ZodString>;
    }, z.core.$strip>>;
    pages: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        master: z.ZodOptional<z.ZodString>;
        theme: z.ZodDefault<z.ZodString>;
        folio: z.ZodOptional<z.ZodObject<{
            show: z.ZodDefault<z.ZodBoolean>;
            label: z.ZodDefault<z.ZodString>;
        }, z.core.$strip>>;
        blocks: z.ZodDefault<z.ZodArray<z.ZodType<Block, unknown, z.core.$ZodTypeInternals<Block, unknown>>>>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export type SlotScreen = z.infer<typeof SlotScreenSchema>;
export type PageDimensions = z.infer<typeof PageDimensionsSchema>;
export type SystemRef = z.infer<typeof SystemRefSchema>;
export type Page = z.infer<typeof PageSchema>;
export type FolioDocument = z.infer<typeof FolioDocumentSchema>;
