"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PageManager = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const useFolioStore_1 = require("../../store/useFolioStore");
const PageManager = () => {
    const document = (0, useFolioStore_1.useFolioStore)((state) => state.document);
    const selection = (0, useFolioStore_1.useFolioStore)((state) => state.selection);
    const selectSlot = (0, useFolioStore_1.useFolioStore)((state) => state.selectSlot);
    const addPage = (0, useFolioStore_1.useFolioStore)((state) => state.addPage);
    const removePage = (0, useFolioStore_1.useFolioStore)((state) => state.removePage);
    const reorderPage = (0, useFolioStore_1.useFolioStore)((state) => state.reorderPage);
    const updatePageLabel = (0, useFolioStore_1.useFolioStore)((state) => state.updatePageLabel);
    const updatePageTheme = (0, useFolioStore_1.useFolioStore)((state) => state.updatePageTheme);
    if (!document)
        return null;
    return ((0, jsx_runtime_1.jsxs)("div", { style: { flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }, children: [(0, jsx_runtime_1.jsxs)("span", { style: { fontSize: '10px', fontFamily: 'JetBrains Mono', color: '#6B7A94', letterSpacing: '0.08em' }, children: ["DOCUMENT PAGES (", document.pages.length, ")"] }), (0, jsx_runtime_1.jsx)("button", { onClick: () => addPage('dark'), style: {
                            padding: '4px 8px',
                            background: '#2DD4BF',
                            color: '#0A1830',
                            border: 'none',
                            borderRadius: '4px',
                            fontWeight: 700,
                            fontSize: '11px',
                            cursor: 'pointer',
                        }, children: "+ Add Page" })] }), document.pages.map((page, idx) => {
                const isSelected = selection?.pageId === page.id;
                return ((0, jsx_runtime_1.jsxs)("div", { onClick: () => selectSlot({ pageId: page.id, blockId: page.blocks[0]?.id || '' }), style: {
                        padding: '10px',
                        borderRadius: '6px',
                        background: isSelected ? 'rgba(45,212,191,0.12)' : '#101F3C',
                        borderLeft: isSelected ? '3px solid #2DD4BF' : '3px solid transparent',
                        border: '1px solid rgba(247,247,249,0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        cursor: 'pointer',
                    }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: '6px' }, children: [(0, jsx_runtime_1.jsxs)("span", { style: { fontSize: '10px', fontFamily: 'JetBrains Mono', color: '#6B7A94' }, children: [idx + 1, "."] }), (0, jsx_runtime_1.jsx)("input", { type: "text", value: page.folio?.label || `Page ${idx + 1}`, onChange: (e) => updatePageLabel(page.id, e.target.value), style: {
                                        flex: 1,
                                        background: 'transparent',
                                        border: 'none',
                                        outline: 'none',
                                        color: '#F7F7F9',
                                        fontWeight: 600,
                                        fontSize: '12px',
                                    } }), (0, jsx_runtime_1.jsx)("button", { onClick: (e) => {
                                        e.stopPropagation();
                                        updatePageTheme(page.id, page.theme === 'dark' ? 'light' : 'dark');
                                    }, title: "Toggle page theme", style: { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '12px' }, children: page.theme === 'dark' ? '🌙' : '☀️' })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', borderTop: '1px solid rgba(247,247,249,0.05)' }, children: [(0, jsx_runtime_1.jsxs)("span", { style: { fontSize: '10px', color: '#6B7A94' }, children: [page.blocks.length, " blocks"] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: '4px' }, children: [(0, jsx_runtime_1.jsx)("button", { disabled: idx === 0, onClick: (e) => {
                                                e.stopPropagation();
                                                reorderPage(page.id, 'up');
                                            }, style: { background: 'transparent', border: 'none', color: idx === 0 ? '#334155' : '#6B7A94', cursor: 'pointer', fontSize: '10px' }, children: "\u25B2" }), (0, jsx_runtime_1.jsx)("button", { disabled: idx === document.pages.length - 1, onClick: (e) => {
                                                e.stopPropagation();
                                                reorderPage(page.id, 'down');
                                            }, style: { background: 'transparent', border: 'none', color: idx === document.pages.length - 1 ? '#334155' : '#6B7A94', cursor: 'pointer', fontSize: '10px' }, children: "\u25BC" }), (0, jsx_runtime_1.jsx)("button", { disabled: document.pages.length <= 1, onClick: (e) => {
                                                e.stopPropagation();
                                                removePage(page.id);
                                            }, style: { background: 'transparent', border: 'none', color: document.pages.length <= 1 ? '#334155' : '#EF4444', cursor: 'pointer', fontSize: '10px' }, children: "\uD83D\uDDD1\uFE0F" })] })] })] }, page.id));
            })] }));
};
exports.PageManager = PageManager;
