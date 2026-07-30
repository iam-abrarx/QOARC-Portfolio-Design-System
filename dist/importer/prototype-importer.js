"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeFileHash = computeFileHash;
exports.parseCssTokens = parseCssTokens;
exports.splitHtmlIntoChildren = splitHtmlIntoChildren;
exports.importPrototypeProject = importPrototypeProject;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const system_schema_1 = require("../schemas/system.schema");
const ROOT_DIR = path_1.default.resolve(__dirname, '../../');
const OUTPUT_DIR = path_1.default.join(ROOT_DIR, 'dist-folio-project');
function computeFileHash(filePath) {
    const fileBuffer = fs_1.default.readFileSync(filePath);
    const hashSum = crypto_1.default.createHash('sha256');
    hashSum.update(fileBuffer);
    return 'sha256:' + hashSum.digest('hex');
}
function parseCssTokens(tokensCssContent) {
    const colorMap = {
        deepSpace: { $type: 'color', $value: '#0A1830' },
        oxfordNavy: { $type: 'color', $value: '#0F2244' },
        slate: { $type: 'color', $value: '#6B7A94' },
        paperWhite: { $type: 'color', $value: '#F7F7F9' },
        signalTeal: { $type: 'color', $value: '#2DD4BF' },
    };
    const hexMatches = tokensCssContent.matchAll(/--qo-([\w-]+):\s*(#[0-9a-fA-F]{3,8})/g);
    for (const match of hexMatches) {
        const varName = match[1];
        const hexVal = match[2];
        const camelKey = varName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        colorMap[camelKey] = {
            $type: 'color',
            $value: hexVal,
        };
    }
    const systemData = {
        $schema: 'https://folio.app/schema/system/1.json',
        id: 'sys_qoarc_v06',
        name: 'QOARC Design System',
        version: '0.6.0',
        tokens: {
            color: colorMap,
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
/**
 * Splits HTML code into root level elements/siblings.
 */
function splitHtmlIntoChildren(html) {
    const children = [];
    let remaining = html.trim();
    while (remaining.length > 0) {
        const match = remaining.match(/^<([a-z0-9:-]+)(?:\s+[^>]*?)?>/i);
        if (!match) {
            // Plain text or no tag
            children.push(remaining);
            break;
        }
        const tag = match[1];
        const startTag = match[0];
        let depth = 1;
        let pos = startTag.length;
        const openRegex = new RegExp(`<${tag}(?:\\s+[^>]*?)?>`, 'i');
        const closeRegex = new RegExp(`</${tag}>`, 'i');
        while (depth > 0 && pos < remaining.length) {
            const sub = remaining.substring(pos);
            const nextOpen = sub.match(openRegex);
            const nextClose = sub.match(closeRegex);
            const openIdx = nextOpen && nextOpen.index !== undefined ? nextOpen.index : -1;
            const closeIdx = nextClose && nextClose.index !== undefined ? nextClose.index : -1;
            if (closeIdx === -1) {
                pos = remaining.length;
                depth = 0;
                break;
            }
            if (openIdx !== -1 && openIdx < closeIdx) {
                depth++;
                pos += openIdx + nextOpen[0].length;
            }
            else {
                depth--;
                pos += closeIdx + nextClose[0].length;
            }
        }
        const elementHtml = remaining.substring(0, pos).trim();
        if (elementHtml) {
            children.push(elementHtml);
        }
        remaining = remaining.substring(pos).trim();
    }
    return children;
}
function importPrototypeProject() {
    const projDir = path_1.default.join(OUTPUT_DIR, 'QOARC.folio');
    const systemsDir = path_1.default.join(projDir, 'systems');
    const docsDir = path_1.default.join(projDir, 'documents');
    const assetsDir = path_1.default.join(projDir, 'assets');
    fs_1.default.mkdirSync(systemsDir, { recursive: true });
    fs_1.default.mkdirSync(docsDir, { recursive: true });
    fs_1.default.mkdirSync(assetsDir, { recursive: true });
    // 1. Parse & Write Design System
    const tokensCssPath = path_1.default.join(ROOT_DIR, 'css/tokens.css');
    const tokensCssContent = fs_1.default.readFileSync(tokensCssPath, 'utf-8');
    const system = parseCssTokens(tokensCssContent);
    fs_1.default.writeFileSync(path_1.default.join(systemsDir, 'system.json'), JSON.stringify(system, null, 2));
    // 2. Index Assets & Copy Screenshots
    const assetHashMap = {};
    const sitesDir = path_1.default.join(ROOT_DIR, 'sites');
    if (fs_1.default.existsSync(sitesDir)) {
        const scanAssets = (dir) => {
            const files = fs_1.default.readdirSync(dir);
            for (const file of files) {
                const fullPath = path_1.default.join(dir, file);
                const stat = fs_1.default.statSync(fullPath);
                if (stat.isDirectory()) {
                    scanAssets(fullPath);
                }
                else if (/\.(png|jpg|jpeg|webp|svg)$/i.test(file)) {
                    const hash = computeFileHash(fullPath);
                    const ext = path_1.default.extname(file);
                    const assetFileName = `${hash.replace('sha256:', '')}${ext}`;
                    const targetAssetPath = path_1.default.join(assetsDir, assetFileName);
                    fs_1.default.copyFileSync(fullPath, targetAssetPath);
                    assetHashMap[hash] = {
                        hash,
                        filename: assetFileName,
                        path: `assets/${assetFileName}`,
                        mimeType: `image/${ext.replace('.', '')}`,
                    };
                }
            }
        };
        scanAssets(sitesDir);
    }
    // 3. Parse Actual index.html Pages & Blocks
    const indexPath = path_1.default.join(ROOT_DIR, 'index.html');
    const indexHtml = fs_1.default.readFileSync(indexPath, 'utf-8');
    const pages = [];
    const sectionRegex = /<section\s+class="qo-page\s*([^"]*)"[^>]*>([\s\S]*?)<\/section>/g;
    let match;
    let pageIdx = 1;
    while ((match = sectionRegex.exec(indexHtml)) !== null) {
        const classes = match[1].trim();
        const content = match[2];
        const isLight = classes.includes('qo-page--light');
        let label = `Page ${pageIdx}`;
        const hasHead = indexHtml.includes('qo-page__head') && content.includes('qo-page__head');
        const hasFoot = indexHtml.includes('qo-page__foot') && content.includes('qo-page__foot');
        const labelMatch = content.match(/<header class="qo-page__head">[\s\S]*?<span>([\s\S]*?)<\/span>/) ||
            content.match(/<footer class="qo-page__foot">[\s\S]*?<span>([\s\S]*?)<\/span>/);
        if (labelMatch) {
            label = labelMatch[1].trim();
        }
        let bodyHtml = content.trim();
        const bodyMatch = content.match(/<div class="qo-page__body">([\s\S]*?)<\/div>/);
        if (bodyMatch) {
            bodyHtml = bodyMatch[1].trim();
        }
        else {
            bodyHtml = bodyHtml.replace(/<header[\s\S]*?<\/header>/g, '')
                .replace(/<footer[\s\S]*?<\/footer>/g, '')
                .trim();
        }
        // Split HTML body into discrete component-level blocks
        const childrenHtml = splitHtmlIntoChildren(bodyHtml);
        const blocks = childrenHtml.map((html, blockIdx) => {
            // Fix relative image paths to load correctly in dist/renderer/index.html PWA view
            const fixedHtml = html.replace(/src="sites\//g, 'src="../../sites/');
            return {
                id: `bk_html_${pageIdx}_${blockIdx}`,
                type: 'htmlBlock',
                slots: {
                    html: fixedHtml,
                },
            };
        });
        pages.push({
            id: `pg_${pageIdx}`,
            theme: isLight ? 'light' : 'dark',
            master: classes,
            folio: { show: hasHead || hasFoot, label },
            blocks,
        });
        pageIdx++;
    }
    const document = {
        $schema: 'https://folio.app/schema/document/1.json',
        id: 'doc_qoarc_v06',
        schemaVersion: 1,
        title: 'Portfolio Design System',
        system: { ref: system.id, version: system.version },
        page: { width: '297mm', height: '210mm', margin: '18mm', bleed: '0mm' },
        pages,
    };
    fs_1.default.writeFileSync(path_1.default.join(docsDir, 'doc.doc.json'), JSON.stringify(document, null, 2));
    // 4. Write Project Manifest
    const manifest = {
        $schema: 'https://folio.app/schema/project/1.json',
        id: 'proj_qoarc_v06',
        name: 'QOARC Portfolio Project',
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        systems: ['systems/system.json'],
        documents: ['documents/doc.doc.json'],
        assets: assetHashMap,
    };
    fs_1.default.writeFileSync(path_1.default.join(projDir, 'project.json'), JSON.stringify(manifest, null, 2));
    return projDir;
}
if (require.main === module) {
    const result = importPrototypeProject();
    console.log(`✅ Native .folio Project Generated Successfully at:\n   ${result}`);
}
