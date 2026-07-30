"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveSpecimenView = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const useFolioStore_1 = require("../../store/useFolioStore");
const LiveSpecimenView = () => {
    const system = (0, useFolioStore_1.useFolioStore)((state) => state.system);
    if (!system)
        return null;
    const colors = system.tokens.color;
    return ((0, jsx_runtime_1.jsxs)("div", { style: { padding: '16px', background: '#101F3C', borderRadius: '8px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }, children: [(0, jsx_runtime_1.jsx)("h3", { style: { margin: 0, fontSize: '14px', fontFamily: 'JetBrains Mono', color: '#2DD4BF' }, children: "Live Specimen Preview" }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }, children: Object.entries(colors).map(([name, token]) => ((0, jsx_runtime_1.jsxs)("div", { style: { background: '#0A1830', padding: '8px', borderRadius: '6px', textAlign: 'center' }, children: [(0, jsx_runtime_1.jsx)("div", { style: { height: '36px', borderRadius: '4px', background: token.$value, marginBottom: '6px' } }), (0, jsx_runtime_1.jsx)("div", { style: { fontSize: '11px', fontWeight: 600, color: '#F7F7F9' }, children: name }), (0, jsx_runtime_1.jsx)("div", { style: { fontSize: '9px', color: '#6B7A94', fontFamily: 'JetBrains Mono' }, children: token.$value })] }, name))) }), (0, jsx_runtime_1.jsxs)("div", { style: { padding: '12px', background: '#0A1830', borderRadius: '6px', display: 'flex', gap: '12px', alignItems: 'center' }, children: [(0, jsx_runtime_1.jsx)("button", { style: { background: colors.signalTeal?.$value || '#2DD4BF', color: '#0A1830', border: 'none', padding: '8px 16px', borderRadius: '99px', fontWeight: 700, cursor: 'pointer' }, children: "Primary Action" }), (0, jsx_runtime_1.jsx)("button", { style: { background: 'transparent', border: '1px solid rgba(247,247,249,0.2)', color: '#F7F7F9', padding: '8px 16px', borderRadius: '99px', fontWeight: 600, cursor: 'pointer' }, children: "Secondary Action" })] })] }));
};
exports.LiveSpecimenView = LiveSpecimenView;
