"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateSelection = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const TemplateSelection = ({ onSelectTemplate }) => {
    const templates = [
        {
            id: 'qoarc',
            title: 'QOARC Design System Portfolio',
            description: 'The complete W3C-compliant design system template with 16 pages, custom device mockups, full typography scale, buttons matrix, and color swatches parsed from index.html.',
            badge: 'Recommended',
            pagesCount: 16,
            theme: 'Deep Space / Light Accent',
            icon: '📐',
        },
        {
            id: 'minimal_agency',
            title: 'Minimal Agency Showcase',
            description: 'Clean, high-contrast, modern agency template focusing on wide typography, large image grids, and minimalist margins.',
            badge: 'Modern',
            pagesCount: 8,
            theme: 'Paper White / Pitch Black',
            icon: '✨',
        },
        {
            id: 'developer_mono',
            title: 'Developer Spec Sheet & Doc',
            description: 'A technical documentation and spec sheet layout featuring monospace type scales, layout grids, and raw dark accents.',
            badge: 'Technical',
            pagesCount: 6,
            theme: 'Terminal Dark / Neon Green',
            icon: '📟',
        },
    ];
    return ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100vw', height: '100vh', background: '#071020', color: '#F7F7F9', fontFamily: 'Hanken Grotesk, sans-serif', padding: '32px' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { textAlign: 'center', marginBottom: '40px', maxWidth: '600px' }, children: [(0, jsx_runtime_1.jsx)("span", { style: { fontFamily: 'JetBrains Mono', color: '#2DD4BF', fontSize: '12px', fontWeight: 700, letterSpacing: '0.15em' }, children: "VISUAL COMPILER & BUILDER" }), (0, jsx_runtime_1.jsx)("h1", { style: { fontSize: '36px', fontWeight: 800, marginTop: '8px', marginBottom: '12px', color: '#FFFFFF', letterSpacing: '-0.02em' }, children: "Welcome to Folio" }), (0, jsx_runtime_1.jsx)("p", { style: { color: '#6B7A94', fontSize: '15px', lineHeight: '1.5' }, children: "Select a case study document template to initialize your workspace. You can edit styles, tokens, and layouts in real-time." })] }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', width: '100%', maxWidth: '1080px' }, children: templates.map((tpl) => ((0, jsx_runtime_1.jsxs)("div", { onClick: () => onSelectTemplate(tpl.id), style: {
                        background: '#0A1830',
                        border: '1px solid rgba(247,247,249,0.08)',
                        borderRadius: '12px',
                        padding: '24px',
                        cursor: 'pointer',
                        transition: 'transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                    }, onMouseEnter: (e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.borderColor = '#2DD4BF';
                        e.currentTarget.style.boxShadow = '0 12px 30px rgba(45,212,191,0.15)';
                    }, onMouseLeave: (e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.borderColor = 'rgba(247,247,249,0.08)';
                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
                    }, children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }, children: [(0, jsx_runtime_1.jsx)("span", { style: { fontSize: '32px' }, children: tpl.icon }), (0, jsx_runtime_1.jsx)("span", { style: { fontSize: '10px', fontFamily: 'JetBrains Mono', color: '#2DD4BF', background: 'rgba(45,212,191,0.12)', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }, children: tpl.badge })] }), (0, jsx_runtime_1.jsx)("h3", { style: { fontSize: '18px', fontWeight: 700, color: '#FFFFFF', marginBottom: '10px' }, children: tpl.title }), (0, jsx_runtime_1.jsx)("p", { style: { color: '#6B7A94', fontSize: '12px', lineHeight: '1.5', marginBottom: '20px' }, children: tpl.description })] }), (0, jsx_runtime_1.jsxs)("div", { style: { borderTop: '1px solid rgba(247,247,249,0.08)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'JetBrains Mono', color: '#6B7A94' }, children: [(0, jsx_runtime_1.jsxs)("div", { children: ["Pages: ", (0, jsx_runtime_1.jsx)("span", { style: { color: '#2DD4BF', fontWeight: 'bold' }, children: tpl.pagesCount })] }), (0, jsx_runtime_1.jsxs)("div", { children: ["Theme: ", (0, jsx_runtime_1.jsx)("span", { style: { color: '#F7F7F9' }, children: tpl.theme })] })] })] }, tpl.id))) })] }));
};
exports.TemplateSelection = TemplateSelection;
