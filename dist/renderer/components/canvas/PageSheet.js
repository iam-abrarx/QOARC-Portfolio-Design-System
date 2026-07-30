"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PageSheet = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importDefault(require("react"));
const BlockRenderer_1 = require("./BlockRenderer");
const useFolioStore_1 = require("../../store/useFolioStore");
const PageSheet = ({ page, pageNumber }) => {
    const isLight = page.theme === 'light';
    // Use the exact original layout classes (like qo-cover, qo-page--light, etc.) from the template
    const pageClass = `qo-page ${page.master || ''}`;
    const selection = (0, useFolioStore_1.useFolioStore)((state) => state.selection);
    const selectSlot = (0, useFolioStore_1.useFolioStore)((state) => state.selectSlot);
    react_1.default.useEffect(() => {
        if (selection?.pageId === page.id) {
            const pageElement = document.getElementById(page.id);
            if (pageElement) {
                pageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [selection?.pageId, page.id]);
    const showHeaderFooter = page.folio?.show !== false;
    return ((0, jsx_runtime_1.jsxs)("section", { className: pageClass, id: page.id, children: [showHeaderFooter && ((0, jsx_runtime_1.jsxs)("header", { className: "qo-page__head", style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }, children: [(0, jsx_runtime_1.jsx)("span", { children: page.folio?.label || `Page ${pageNumber}` }), (0, jsx_runtime_1.jsxs)("select", { onChange: (e) => {
                            if (e.target.value) {
                                selectSlot({ pageId: page.id, blockId: e.target.value });
                            }
                        }, value: selection?.pageId === page.id ? selection.blockId : '', style: {
                            background: '#101F3C',
                            color: '#2DD4BF',
                            border: '1px solid rgba(247,247,249,0.15)',
                            borderRadius: '4px',
                            fontSize: '9.5px',
                            padding: '2px 6px',
                            fontFamily: 'JetBrains Mono',
                            cursor: 'pointer',
                            outline: 'none',
                        }, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "-- View Blocks --" }), page.blocks.map((b) => ((0, jsx_runtime_1.jsxs)("option", { value: b.id, children: [b.type, " (", b.id, ")"] }, b.id)))] }), (0, jsx_runtime_1.jsx)("span", { children: "QOARC Design System" })] })), page.master?.includes('qo-cover') ? (
            // Cover Page has specific direct children styles, so render children directly without wrapper
            (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: page.blocks.map((block) => ((0, jsx_runtime_1.jsx)(BlockRenderer_1.BlockRenderer, { block: block, pageId: page.id }, block.id))) })) : ((0, jsx_runtime_1.jsx)("div", { className: "qo-page__body", children: page.blocks.map((block) => ((0, jsx_runtime_1.jsx)(BlockRenderer_1.BlockRenderer, { block: block, pageId: page.id }, block.id))) })), showHeaderFooter && ((0, jsx_runtime_1.jsxs)("footer", { className: "qo-page__foot", children: [(0, jsx_runtime_1.jsx)("span", { children: page.folio?.label || `Page ${pageNumber}` }), (0, jsx_runtime_1.jsx)("span", { className: "qo-page__num", children: String(pageNumber).padStart(2, '0') })] }))] }));
};
exports.PageSheet = PageSheet;
