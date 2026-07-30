"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createQoarcStarterProject = createQoarcStarterProject;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function createQoarcStarterProject(targetPath) {
    const projDir = path_1.default.join(targetPath, 'QOARC-Starter.folio');
    fs_1.default.mkdirSync(path_1.default.join(projDir, 'systems'), { recursive: true });
    fs_1.default.mkdirSync(path_1.default.join(projDir, 'documents'), { recursive: true });
    fs_1.default.mkdirSync(path_1.default.join(projDir, 'assets'), { recursive: true });
    const manifest = {
        $schema: 'https://folio.app/schema/project/1.json',
        id: 'proj_qoarc_starter',
        name: 'QOARC Starter Project',
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        systems: ['systems/qoarc.system.json'],
        documents: ['documents/starter.doc.json'],
        assets: {},
    };
    const system = {
        $schema: 'https://folio.app/schema/system/1.json',
        id: 'sys_qoarc_starter',
        name: 'QOARC Design System',
        version: '1.2.0',
        tokens: {
            color: {
                deepSpace: { $type: 'color', $value: '#0A1830' },
                oxfordNavy: { $type: 'color', $value: '#0F2244' },
                slate: { $type: 'color', $value: '#6B7A94' },
                paperWhite: { $type: 'color', $value: '#F7F7F9' },
                signalTeal: { $type: 'color', $value: '#2DD4BF' },
            },
            font: {
                brand: { $type: 'fontFamily', $value: ['Hanken Grotesk', 'sans-serif'] },
                technical: { $type: 'fontFamily', $value: ['JetBrains Mono', 'monospace'] },
                editorial: { $type: 'fontFamily', $value: ['Fraunces', 'serif'] },
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
    const document = {
        $schema: 'https://folio.app/schema/document/1.json',
        id: 'doc_starter',
        schemaVersion: 1,
        title: 'Starter Case Study',
        system: { ref: 'sys_qoarc_starter', version: '1.2.0' },
        page: { width: '297mm', height: '210mm', margin: '18mm', bleed: '0mm' },
        pages: [
            {
                id: 'pg_1',
                theme: 'dark',
                folio: { show: true, label: '01 — Cover' },
                blocks: [
                    { id: 'bk_1', type: 'sectionHeader', slots: { eyebrow: 'FOLIO STARTER', title: 'Starter Case Study' } },
                    { id: 'bk_2', type: 'textBlock', slots: { body: 'Welcome to Folio — your design system is bound directly to this document.' } },
                ],
            },
        ],
    };
    fs_1.default.writeFileSync(path_1.default.join(projDir, 'project.json'), JSON.stringify(manifest, null, 2));
    fs_1.default.writeFileSync(path_1.default.join(projDir, 'systems/qoarc.system.json'), JSON.stringify(system, null, 2));
    fs_1.default.writeFileSync(path_1.default.join(projDir, 'documents/starter.doc.json'), JSON.stringify(document, null, 2));
    return projDir;
}
