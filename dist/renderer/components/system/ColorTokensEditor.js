"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ColorTokensEditor = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const useFolioStore_1 = require("../../store/useFolioStore");
const ColorTokensEditor = () => {
    const system = (0, useFolioStore_1.useFolioStore)((state) => state.system);
    const updateTokenColor = (0, useFolioStore_1.useFolioStore)((state) => state.updateTokenColor);
    if (!system)
        return null;
    const colorTokens = system.tokens.color;
    return ((0, jsx_runtime_1.jsxs)("div", { style: { padding: '16px', background: '#101F3C', borderRadius: '8px' }, children: [(0, jsx_runtime_1.jsx)("h3", { style: { margin: '0 0 12px', fontSize: '14px', fontFamily: 'JetBrains Mono', color: '#2DD4BF' }, children: "Brand Color Palette" }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', flexDirection: 'column', gap: '12px' }, children: Object.entries(colorTokens).map(([key, token]) => ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { style: { fontSize: '13px', fontWeight: 600, color: '#F7F7F9' }, children: key }), (0, jsx_runtime_1.jsx)("div", { style: { fontSize: '11px', color: '#6B7A94', fontFamily: 'JetBrains Mono' }, children: token.$value })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' }, children: [(0, jsx_runtime_1.jsx)("input", { type: "color", value: token.$value, onChange: (e) => updateTokenColor(key, e.target.value), style: { width: '32px', height: '32px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' } }), (0, jsx_runtime_1.jsx)("input", { type: "text", value: token.$value, onChange: (e) => updateTokenColor(key, e.target.value), style: {
                                        width: '80px',
                                        padding: '4px 6px',
                                        borderRadius: '4px',
                                        border: '1px solid rgba(247,247,249,0.2)',
                                        background: '#0A1830',
                                        color: '#F7F7F9',
                                        fontSize: '11px',
                                        fontFamily: 'JetBrains Mono',
                                    } })] })] }, key))) })] }));
};
exports.ColorTokensEditor = ColorTokensEditor;
