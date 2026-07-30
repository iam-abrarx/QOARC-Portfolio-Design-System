"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importFigmaVariablesJson = importFigmaVariablesJson;
const system_schema_1 = require("../schemas/system.schema");
function importFigmaVariablesJson(jsonContent) {
    const data = JSON.parse(jsonContent);
    const colorTokens = {
        deepSpace: { $type: 'color', $value: '#0A1830' },
        oxfordNavy: { $type: 'color', $value: '#0F2244' },
        slate: { $type: 'color', $value: '#6B7A94' },
        paperWhite: { $type: 'color', $value: '#F7F7F9' },
        signalTeal: { $type: 'color', $value: '#2DD4BF' },
    };
    if (data.meta?.variables) {
        for (const v of Object.values(data.meta.variables)) {
            if (v.resolvedType === 'COLOR') {
                const cleanName = v.name.replace(/[^a-zA-Z0-9]/g, '');
                const firstVal = Object.values(v.valuesByMode)[0];
                let hexValue = '#0A1830';
                if (typeof firstVal === 'string') {
                    hexValue = firstVal;
                }
                else if (typeof firstVal === 'object' && firstVal !== null) {
                    const r = Math.round((firstVal.r || 0) * 255).toString(16).padStart(2, '0');
                    const g = Math.round((firstVal.g || 0) * 255).toString(16).padStart(2, '0');
                    const b = Math.round((firstVal.b || 0) * 255).toString(16).padStart(2, '0');
                    hexValue = `#${r}${g}${b}`;
                }
                colorTokens[cleanName || 'importedColor'] = {
                    $type: 'color',
                    $value: hexValue,
                };
            }
        }
    }
    const systemData = {
        $schema: 'https://folio.app/schema/system/1.json',
        id: 'sys_figma_imported',
        name: 'Figma Imported System',
        version: '1.0.0',
        tokens: {
            color: colorTokens,
            font: {
                brand: { $type: 'fontFamily', $value: ['Hanken Grotesk', 'sans-serif'] },
                technical: { $type: 'fontFamily', $value: ['JetBrains Mono', 'monospace'] },
                editorial: { $type: 'fontFamily', $value: ['Fraunces', 'serif'] },
            },
            scale: {
                type: { $type: 'scale', $value: { ratio: 1.2, base: '16px', fluid: true } },
                space: { $type: 'scale', $value: { base: '4px', steps: [1, 2, 3, 4, 6, 8, 12, 16] } },
            },
        },
        themes: {
            dark: { bg: '{color.deepSpace}', surface: '{color.oxfordNavy}', text: '{color.paperWhite}', accent: '{color.signalTeal}' },
            light: { bg: '{color.paperWhite}', surface: '#FFFFFF', text: '{color.oxfordNavy}', accent: '#0E9E8B' },
        },
        rules: [
            { id: 'one-accent-per-view', severity: 'warn', description: 'At most one accent element per view', check: { type: 'countRoleUsage', role: 'accent', max: 1 } },
        ],
    };
    return system_schema_1.DesignSystemSchema.parse(systemData);
}
