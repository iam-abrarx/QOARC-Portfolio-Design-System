"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemEditor = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const ColorTokensEditor_1 = require("./ColorTokensEditor");
const ThemeSwitcher_1 = require("./ThemeSwitcher");
const LiveSpecimenView_1 = require("./LiveSpecimenView");
const SystemEditor = () => {
    return ((0, jsx_runtime_1.jsxs)("div", { style: { flex: 1, padding: '24px', background: '#071020', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }, children: [(0, jsx_runtime_1.jsx)("h2", { style: { margin: 0, fontSize: '20px', color: '#F7F7F9', fontFamily: 'Hanken Grotesk' }, children: "Design System Manager" }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexDirection: 'column', gap: '20px' }, children: [(0, jsx_runtime_1.jsx)(ColorTokensEditor_1.ColorTokensEditor, {}), (0, jsx_runtime_1.jsx)(ThemeSwitcher_1.ThemeSwitcher, {})] }), (0, jsx_runtime_1.jsx)(LiveSpecimenView_1.LiveSpecimenView, {})] })] }));
};
exports.SystemEditor = SystemEditor;
