import { z } from 'zod';
export declare const TokenColorSchema: z.ZodObject<{
    $type: z.ZodLiteral<"color">;
    $value: z.ZodString;
    $extensions: z.ZodOptional<z.ZodObject<{
        'folio.derive': z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const TokenFontSchema: z.ZodObject<{
    $type: z.ZodLiteral<"fontFamily">;
    $value: z.ZodArray<z.ZodString>;
    $extensions: z.ZodOptional<z.ZodObject<{
        'folio.variation': z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const TokenScaleSchema: z.ZodObject<{
    $type: z.ZodUnion<[z.ZodLiteral<"scale">, z.ZodLiteral<"other">]>;
    $value: z.ZodRecord<z.ZodString, z.ZodAny>;
}, z.core.$strip>;
export declare const TokensSchema: z.ZodObject<{
    color: z.ZodRecord<z.ZodString, z.ZodObject<{
        $type: z.ZodLiteral<"color">;
        $value: z.ZodString;
        $extensions: z.ZodOptional<z.ZodObject<{
            'folio.derive': z.ZodOptional<z.ZodArray<z.ZodString>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    font: z.ZodRecord<z.ZodString, z.ZodObject<{
        $type: z.ZodLiteral<"fontFamily">;
        $value: z.ZodArray<z.ZodString>;
        $extensions: z.ZodOptional<z.ZodObject<{
            'folio.variation': z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    scale: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        $type: z.ZodUnion<[z.ZodLiteral<"scale">, z.ZodLiteral<"other">]>;
        $value: z.ZodRecord<z.ZodString, z.ZodAny>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const ThemeSchema: z.ZodRecord<z.ZodString, z.ZodString>;
export declare const RuleSchema: z.ZodObject<{
    id: z.ZodString;
    severity: z.ZodEnum<{
        error: "error";
        warn: "warn";
        info: "info";
    }>;
    description: z.ZodOptional<z.ZodString>;
    check: z.ZodRecord<z.ZodString, z.ZodAny>;
}, z.core.$strip>;
export declare const DesignSystemSchema: z.ZodObject<{
    $schema: z.ZodOptional<z.ZodString>;
    id: z.ZodString;
    name: z.ZodString;
    version: z.ZodString;
    tokens: z.ZodObject<{
        color: z.ZodRecord<z.ZodString, z.ZodObject<{
            $type: z.ZodLiteral<"color">;
            $value: z.ZodString;
            $extensions: z.ZodOptional<z.ZodObject<{
                'folio.derive': z.ZodOptional<z.ZodArray<z.ZodString>>;
            }, z.core.$strip>>;
        }, z.core.$strip>>;
        font: z.ZodRecord<z.ZodString, z.ZodObject<{
            $type: z.ZodLiteral<"fontFamily">;
            $value: z.ZodArray<z.ZodString>;
            $extensions: z.ZodOptional<z.ZodObject<{
                'folio.variation': z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
            }, z.core.$strip>>;
        }, z.core.$strip>>;
        scale: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
            $type: z.ZodUnion<[z.ZodLiteral<"scale">, z.ZodLiteral<"other">]>;
            $value: z.ZodRecord<z.ZodString, z.ZodAny>;
        }, z.core.$strip>>>;
    }, z.core.$strip>;
    themes: z.ZodRecord<z.ZodString, z.ZodRecord<z.ZodString, z.ZodString>>;
    rules: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        severity: z.ZodEnum<{
            error: "error";
            warn: "warn";
            info: "info";
        }>;
        description: z.ZodOptional<z.ZodString>;
        check: z.ZodRecord<z.ZodString, z.ZodAny>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export type TokenColor = z.infer<typeof TokenColorSchema>;
export type TokenFont = z.infer<typeof TokenFontSchema>;
export type Tokens = z.infer<typeof TokensSchema>;
export type Theme = z.infer<typeof ThemeSchema>;
export type Rule = z.infer<typeof RuleSchema>;
export type DesignSystem = z.infer<typeof DesignSystemSchema>;
