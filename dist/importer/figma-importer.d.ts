import { DesignSystem } from '../schemas/system.schema';
export interface FigmaVariable {
    id: string;
    name: string;
    resolvedType: 'COLOR' | 'FLOAT' | 'STRING';
    valuesByMode: Record<string, any>;
}
export interface FigmaVariablesExport {
    status?: number;
    meta?: {
        variables: Record<string, FigmaVariable>;
        variableCollections: Record<string, {
            id: string;
            name: string;
            defaultModeId: string;
            modes: {
                modeId: string;
                name: string;
            }[];
        }>;
    };
}
export declare function importFigmaVariablesJson(jsonContent: string): DesignSystem;
