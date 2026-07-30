"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentCanvas = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const useFolioStore_1 = require("../../store/useFolioStore");
const PageSheet_1 = require("./PageSheet");
const DocumentCanvas = () => {
    const document = (0, useFolioStore_1.useFolioStore)((state) => state.document);
    const system = (0, useFolioStore_1.useFolioStore)((state) => state.system);
    if (!document) {
        return ((0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6B7A94' }, children: "No document loaded. Open a project to start authoring." }));
    }
    // Generate dynamic CSS Custom Properties from active system tokens
    const colors = system?.tokens?.color || {};
    const cssVariables = `
    :root {
      --qo-deep-space: ${colors.deepSpace?.$value || '#0A1830'};
      --qo-oxford-navy: ${colors.oxfordNavy?.$value || '#0F2244'};
      --qo-slate: ${colors.slate?.$value || '#6B7A94'};
      --qo-paper-white: ${colors.paperWhite?.$value || '#F7F7F9'};
      --qo-signal-teal: ${colors.signalTeal?.$value || '#2DD4BF'};
      --qo-teal: ${colors.signalTeal?.$value || '#2DD4BF'};
    }
  `;
    return ((0, jsx_runtime_1.jsxs)("div", { style: { overflowY: 'auto', flex: 1, padding: '24px 0', background: '#071020' }, children: [(0, jsx_runtime_1.jsx)("style", { children: cssVariables }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px' }, children: document.pages.map((page, index) => ((0, jsx_runtime_1.jsx)(PageSheet_1.PageSheet, { page: page, pageNumber: index + 1 }, page.id))) })] }));
};
exports.DocumentCanvas = DocumentCanvas;
