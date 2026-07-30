"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockRenderer = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const DeviceBlock_1 = require("./DeviceBlock");
const TableOfContentsBlock_1 = require("./TableOfContentsBlock");
const SpecListBlock_1 = require("./SpecListBlock");
const ElevationLadderBlock_1 = require("./ElevationLadderBlock");
const ButtonMatrixBlock_1 = require("./ButtonMatrixBlock");
const ImageHolderBlock_1 = require("./ImageHolderBlock");
const useFolioStore_1 = require("../../store/useFolioStore");
const BlockRenderer = ({ block, pageId }) => {
    const updateBlockSlots = (0, useFolioStore_1.useFolioStore)((state) => state.updateBlockSlots);
    const selectSlot = (0, useFolioStore_1.useFolioStore)((state) => state.selectSlot);
    const selection = (0, useFolioStore_1.useFolioStore)((state) => state.selection);
    const removeBlock = (0, useFolioStore_1.useFolioStore)((state) => state.removeBlock);
    const insertBlockBelow = (0, useFolioStore_1.useFolioStore)((state) => state.insertBlockBelow);
    const [isHovered, setIsHovered] = (0, react_1.useState)(false);
    const isSelected = selection?.pageId === pageId && selection?.blockId === block.id;
    const handleBlockClick = (e) => {
        e.stopPropagation();
        if (!isSelected) {
            selectSlot({ pageId, blockId: block.id });
        }
    };
    const renderBlockContent = () => {
        switch (block.type) {
            case 'htmlBlock': {
                const htmlContent = typeof block.slots?.html === 'string' ? block.slots.html : '';
                return ((0, jsx_runtime_1.jsx)("div", { dangerouslySetInnerHTML: { __html: htmlContent }, style: { width: '100%', outline: 'none', cursor: 'text' }, contentEditable: true, suppressContentEditableWarning: true, onClick: (e) => {
                        e.stopPropagation(); // Stop click propagation to avoid losing input focus
                    }, onBlur: (e) => {
                        updateBlockSlots(pageId, block.id, { html: e.currentTarget.innerHTML });
                    } }));
            }
            case 'sectionHeader': {
                const eyebrow = typeof block.slots?.eyebrow === 'string' ? block.slots.eyebrow : '';
                const title = typeof block.slots?.title === 'string' ? block.slots.title : '';
                return ((0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 'var(--qo-space-lg, 32px)' }, children: [(0, jsx_runtime_1.jsx)("p", { className: "qo-eyebrow", contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => updateBlockSlots(pageId, block.id, { eyebrow: e.currentTarget.innerText }), children: eyebrow || 'SECTION EYEBROW' }), (0, jsx_runtime_1.jsx)("h2", { className: "qo-page__title", contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => updateBlockSlots(pageId, block.id, { title: e.currentTarget.innerText }), style: { marginTop: 'var(--qo-space-xs, 12px)', outline: 'none' }, children: title || 'Section Title' })] }));
            }
            case 'deviceRow': {
                return ((0, jsx_runtime_1.jsx)("div", { className: "qo-device-row", style: { gap: 'var(--qo-space-2xl, 64px)', flex: 1, alignItems: 'center' }, children: block.children?.map((child) => ((0, jsx_runtime_1.jsx)(exports.BlockRenderer, { block: child, pageId: pageId }, child.id))) }));
            }
            case 'device': {
                return (0, jsx_runtime_1.jsx)(DeviceBlock_1.DeviceBlock, { block: block, pageId: pageId });
            }
            case 'imageHolder': {
                return (0, jsx_runtime_1.jsx)(ImageHolderBlock_1.ImageHolderBlock, { block: block });
            }
            case 'tableOfContents': {
                return (0, jsx_runtime_1.jsx)(TableOfContentsBlock_1.TableOfContentsBlock, {});
            }
            case 'specList': {
                return (0, jsx_runtime_1.jsx)(SpecListBlock_1.SpecListBlock, { block: block });
            }
            case 'elevationLadder': {
                return (0, jsx_runtime_1.jsx)(ElevationLadderBlock_1.ElevationLadderBlock, {});
            }
            case 'buttonMatrix': {
                return (0, jsx_runtime_1.jsx)(ButtonMatrixBlock_1.ButtonMatrixBlock, {});
            }
            case 'textBlock': {
                const body = typeof block.slots?.body === 'string' ? block.slots.body : '';
                const title = typeof block.slots?.title === 'string' ? block.slots.title : '';
                return ((0, jsx_runtime_1.jsxs)("div", { style: { margin: '12px 0' }, children: [title && ((0, jsx_runtime_1.jsx)("h1", { className: "qo-page__title", contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => updateBlockSlots(pageId, block.id, { title: e.currentTarget.innerText }), style: { marginBottom: '8px', outline: 'none' }, children: title })), (0, jsx_runtime_1.jsx)("p", { className: "qo-page__lede", contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => updateBlockSlots(pageId, block.id, { body: e.currentTarget.innerText }), style: { outline: 'none' }, children: body || 'Click to edit paragraph body text…' })] }));
            }
            default:
                return ((0, jsx_runtime_1.jsxs)("div", { style: { padding: '8px', border: '1px dashed #6B7A94', borderRadius: '4px', fontSize: '11px' }, children: ["Unknown block type: ", block.type] }));
        }
    };
    return ((0, jsx_runtime_1.jsxs)("div", { onClick: handleBlockClick, onMouseEnter: () => setIsHovered(true), onMouseLeave: () => setIsHovered(false), style: {
            position: 'relative',
            width: '100%',
            borderRadius: '6px',
            border: isSelected ? '1px solid #2DD4BF' : isHovered ? '1px dashed rgba(45,212,191,0.4)' : '1px solid transparent',
            transition: 'border-color 150ms ease',
            cursor: 'pointer',
        }, children: [(isHovered || isSelected) && ((0, jsx_runtime_1.jsxs)("div", { style: {
                    position: 'absolute',
                    top: '-24px',
                    right: '8px',
                    background: '#101F3C',
                    border: '1px solid rgba(247,247,249,0.15)',
                    borderRadius: '4px',
                    display: 'flex',
                    gap: '2px',
                    padding: '2px',
                    zIndex: 99,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                }, onClick: (e) => e.stopPropagation(), children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => selectSlot({ pageId, blockId: block.id }), title: "Edit block properties", style: { background: 'transparent', border: 'none', color: '#2DD4BF', fontSize: '9px', cursor: 'pointer', padding: '2px 4px', fontWeight: 'bold' }, children: "\u270F\uFE0F EDIT" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => insertBlockBelow(pageId, block.id, 'textBlock'), title: "Add text block below", style: { background: 'transparent', border: 'none', color: '#2DD4BF', fontSize: '9px', cursor: 'pointer', padding: '2px 4px', fontWeight: 'bold' }, children: "\u2795 TEXT" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => insertBlockBelow(pageId, block.id, 'sectionHeader'), title: "Add header block below", style: { background: 'transparent', border: 'none', color: '#2DD4BF', fontSize: '9px', cursor: 'pointer', padding: '2px 4px', fontWeight: 'bold' }, children: "\u2795 HEADER" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => removeBlock(pageId, block.id), title: "Delete block", style: { background: 'transparent', border: 'none', color: '#EF4444', fontSize: '9px', cursor: 'pointer', padding: '2px 4px', fontWeight: 'bold' }, children: "\uD83D\uDDD1\uFE0F DELETE" })] })), renderBlockContent()] }));
};
exports.BlockRenderer = BlockRenderer;
