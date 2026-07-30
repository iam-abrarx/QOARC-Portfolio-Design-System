"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runExportPreflight = runExportPreflight;
exports.getPdfPrintOptions = getPdfPrintOptions;
const rule_engine_1 = require("../lint/rule-engine");
function runExportPreflight(doc, system) {
    const problems = (0, rule_engine_1.evaluateDocumentRules)(doc, system);
    const errors = problems.filter((p) => p.severity === 'error');
    return {
        passed: errors.length === 0,
        problems: problems,
        pageCount: doc.pages.length,
        dimensions: {
            width: doc.page.width || '297mm',
            height: doc.page.height || '210mm',
        },
    };
}
function getPdfPrintOptions() {
    return {
        preferCSSPageSize: true,
        printBackground: true,
        margins: {
            marginType: 'none',
        },
    };
}
