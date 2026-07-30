"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageHolderBlock = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const ImageHolderBlock = ({ block }) => {
    const aspectRatio = (typeof block.props?.aspectRatio === 'string' && block.props.aspectRatio) || '16/9';
    const asset = typeof block.slots?.screen === 'object' && block.slots.screen !== null
        ? block.slots.screen.asset
        : typeof block.slots?.asset === 'string'
            ? block.slots.asset
            : undefined;
    const caption = typeof block.slots?.caption === 'string' ? block.slots.caption : 'Image Asset Holder';
    return ((0, jsx_runtime_1.jsxs)("div", { style: { width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', margin: '12px 0' }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                    width: '100%',
                    aspectRatio: aspectRatio,
                    background: '#0F2244',
                    border: '1px dashed rgba(247,247,249,0.25)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                }, children: asset ? ((0, jsx_runtime_1.jsx)("img", { src: asset, alt: "Media Asset", style: { width: '100%', height: '100%', objectFit: 'cover' } })) : ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: '#6B7A94' }, children: [(0, jsx_runtime_1.jsx)("span", { style: { fontSize: '24px' }, children: "\uD83D\uDDBC\uFE0F" }), (0, jsx_runtime_1.jsxs)("span", { style: { fontSize: '11px', fontFamily: 'JetBrains Mono' }, children: [aspectRatio, " Image Placeholder"] }), (0, jsx_runtime_1.jsx)("span", { style: { fontSize: '9px', fontStyle: 'italic' }, children: "Drop asset from tray or click to select" })] })) }), caption && (0, jsx_runtime_1.jsx)("div", { style: { fontSize: '10px', color: '#6B7A94', fontFamily: 'JetBrains Mono', textAlign: 'center' }, children: caption })] }));
};
exports.ImageHolderBlock = ImageHolderBlock;
