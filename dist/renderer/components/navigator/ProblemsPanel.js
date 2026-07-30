"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProblemsPanel = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const useFolioStore_1 = require("../../store/useFolioStore");
const rule_engine_1 = require("../../../lint/rule-engine");
const ProblemsPanel = () => {
    const document = (0, useFolioStore_1.useFolioStore)((state) => state.document);
    const system = (0, useFolioStore_1.useFolioStore)((state) => state.system);
    const selectSlot = (0, useFolioStore_1.useFolioStore)((state) => state.selectSlot);
    if (!document || !system)
        return null;
    const problems = (0, rule_engine_1.evaluateDocumentRules)(document, system);
    return ((0, jsx_runtime_1.jsxs)("div", { style: { flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { fontSize: '10px', fontFamily: 'JetBrains Mono', color: '#6B7A94', letterSpacing: '0.08em', marginBottom: '4px' }, children: ["PROBLEMS & LINT (", problems.length, ")"] }), problems.length === 0 ? ((0, jsx_runtime_1.jsx)("div", { style: { fontSize: '12px', color: '#2DD4BF', fontStyle: 'italic', padding: '12px', background: 'rgba(45,212,191,0.08)', borderRadius: '6px' }, children: "\u2713 No design lint problems detected!" })) : (problems.map((p) => ((0, jsx_runtime_1.jsxs)("div", { onClick: () => selectSlot({ pageId: p.pageId, blockId: p.blockId || '' }), style: {
                    padding: '10px',
                    borderRadius: '6px',
                    background: '#101F3C',
                    borderLeft: p.severity === 'error' ? '3px solid #EF4444' : '3px solid #F59E0B',
                    border: '1px solid rgba(247,247,249,0.12)',
                    cursor: 'pointer',
                }, children: [(0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }, children: (0, jsx_runtime_1.jsxs)("span", { style: { fontSize: '10px', fontFamily: 'JetBrains Mono', color: p.severity === 'error' ? '#EF4444' : '#F59E0B', textTransform: 'uppercase' }, children: [p.severity, ": ", p.ruleId] }) }), (0, jsx_runtime_1.jsx)("div", { style: { fontSize: '11px', color: '#F7F7F9', lineHeight: 1.4 }, children: p.message })] }, p.id))))] }));
};
exports.ProblemsPanel = ProblemsPanel;
