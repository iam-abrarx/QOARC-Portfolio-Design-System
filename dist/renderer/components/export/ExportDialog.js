"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportDialog = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const useFolioStore_1 = require("../../store/useFolioStore");
const html_exporter_1 = require("../../../export/html-exporter");
const token_exporter_1 = require("../../../export/token-exporter");
const pdf_exporter_1 = require("../../../export/pdf-exporter");
const ExportDialog = ({ onClose }) => {
    const document = (0, useFolioStore_1.useFolioStore)((state) => state.document);
    const system = (0, useFolioStore_1.useFolioStore)((state) => state.system);
    const [statusMsg, setStatusMsg] = (0, react_1.useState)('');
    if (!document || !system)
        return null;
    const preflight = (0, pdf_exporter_1.runExportPreflight)(document, system);
    const downloadFile = (content, filename, type) => {
        const blob = new Blob([content], { type });
        const a = window.document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
    };
    const handleExportPdf = () => {
        setStatusMsg('Running pre-flight validation…');
        if (!preflight.passed) {
            setStatusMsg(`Pre-flight warning: Found ${preflight.problems.length} lint issues.`);
        }
        setTimeout(() => {
            window.print();
            setStatusMsg('Print dialog opened.');
        }, 200);
    };
    const handleExportHtml = () => {
        const html = (0, html_exporter_1.exportDocumentToHtml)(document, system);
        downloadFile(html, 'index.html', 'text/html');
        setStatusMsg('Exported standalone index.html');
    };
    const handleExportTokensJson = () => {
        const dtcg = (0, token_exporter_1.exportTokensToDtcgJson)(system);
        downloadFile(dtcg, 'qoarc.system.json', 'application/json');
        setStatusMsg('Exported DTCG Tokens JSON');
    };
    const handleExportTokensCss = () => {
        const css = (0, token_exporter_1.exportTokensToCss)(system);
        downloadFile(css, 'tokens.css', 'text/css');
        setStatusMsg('Exported tokens.css');
    };
    return ((0, jsx_runtime_1.jsx)("div", { style: { position: 'fixed', inset: 0, background: 'rgba(10,24,48,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }, children: (0, jsx_runtime_1.jsxs)("div", { style: { width: '480px', background: '#0D1B33', border: '1px solid rgba(247,247,249,0.16)', borderRadius: '12px', padding: '24px', color: '#F7F7F9', display: 'flex', flexDirection: 'column', gap: '20px' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(247,247,249,0.1)', paddingBottom: '12px' }, children: [(0, jsx_runtime_1.jsx)("h3", { style: { margin: 0, fontSize: '16px', fontFamily: 'JetBrains Mono', color: '#2DD4BF' }, children: "EXPORT DOCUMENT & TOKENS" }), (0, jsx_runtime_1.jsx)("button", { onClick: onClose, style: { background: 'transparent', border: 'none', color: '#6B7A94', fontSize: '20px', cursor: 'pointer' }, children: "\u00D7" })] }), (0, jsx_runtime_1.jsxs)("div", { style: { padding: '12px', background: preflight.passed ? 'rgba(45,212,191,0.08)' : 'rgba(245,158,11,0.1)', borderLeft: preflight.passed ? '3px solid #2DD4BF' : '3px solid #F59E0B', borderRadius: '6px', fontSize: '12px' }, children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Pre-flight Gate:" }), " ", preflight.passed ? 'PASSED' : 'WARNINGS FOUND'] }), (0, jsx_runtime_1.jsxs)("div", { style: { fontSize: '11px', color: '#6B7A94', marginTop: '2px' }, children: [preflight.pageCount, " pages \u00B7 ", preflight.dimensions.width, " \u00D7 ", preflight.dimensions.height, " \u00B7 ", preflight.problems.length, " lint issues"] })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexDirection: 'column', gap: '10px' }, children: [(0, jsx_runtime_1.jsx)("button", { onClick: handleExportPdf, style: { padding: '12px', background: '#2DD4BF', color: '#0A1830', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', textAlign: 'left' }, children: "\uD83D\uDCC4 Export PDF Document (A4 Landscape)" }), (0, jsx_runtime_1.jsx)("button", { onClick: handleExportHtml, style: { padding: '12px', background: '#101F3C', color: '#F7F7F9', border: '1px solid rgba(247,247,249,0.2)', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }, children: "\uD83C\uDF10 Export Standalone HTML Page (index.html)" }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: '8px' }, children: [(0, jsx_runtime_1.jsx)("button", { onClick: handleExportTokensJson, style: { flex: 1, padding: '10px', background: '#101F3C', color: '#F7F7F9', border: '1px solid rgba(247,247,249,0.2)', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '11px' }, children: "\u2699 DTCG Tokens JSON" }), (0, jsx_runtime_1.jsx)("button", { onClick: handleExportTokensCss, style: { flex: 1, padding: '10px', background: '#101F3C', color: '#F7F7F9', border: '1px solid rgba(247,247,249,0.2)', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '11px' }, children: "\uD83C\uDFA8 CSS Custom Props (tokens.css)" })] })] }), statusMsg && (0, jsx_runtime_1.jsx)("div", { style: { fontSize: '11px', color: '#2DD4BF', fontFamily: 'JetBrains Mono' }, children: statusMsg })] }) }));
};
exports.ExportDialog = ExportDialog;
