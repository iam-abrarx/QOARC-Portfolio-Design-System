"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThemeSwitcher = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const useFolioStore_1 = require("../../store/useFolioStore");
const ThemeSwitcher = () => {
    const system = (0, useFolioStore_1.useFolioStore)((state) => state.system);
    if (!system)
        return null;
    const themes = system.themes || {};
    return ((0, jsx_runtime_1.jsxs)("div", { style: { padding: '16px', background: '#101F3C', borderRadius: '8px' }, children: [(0, jsx_runtime_1.jsx)("h3", { style: { margin: '0 0 12px', fontSize: '14px', fontFamily: 'JetBrains Mono', color: '#2DD4BF' }, children: "Semantic Role Mapping & Themes" }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', gap: '12px' }, children: Object.entries(themes).map(([themeName, roles]) => ((0, jsx_runtime_1.jsxs)("div", { style: { flex: 1, padding: '12px', background: '#0A1830', borderRadius: '6px', border: '1px solid rgba(247,247,249,0.1)' }, children: [(0, jsx_runtime_1.jsxs)("h4", { style: { margin: '0 0 8px', fontSize: '12px', textTransform: 'capitalize', color: '#F7F7F9' }, children: [themeName, " Theme"] }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }, children: Object.entries(roles).map(([role, value]) => ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', justifyContent: 'space-between', color: '#6B7A94' }, children: [(0, jsx_runtime_1.jsxs)("span", { children: [role, ":"] }), (0, jsx_runtime_1.jsx)("span", { style: { color: '#2DD4BF', fontFamily: 'JetBrains Mono' }, children: value })] }, role))) })] }, themeName))) })] }));
};
exports.ThemeSwitcher = ThemeSwitcher;
