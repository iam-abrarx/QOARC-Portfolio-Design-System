"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetTray = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const useFolioStore_1 = require("../../store/useFolioStore");
const AssetTray = () => {
    const project = (0, useFolioStore_1.useFolioStore)((state) => state.project);
    const selection = (0, useFolioStore_1.useFolioStore)((state) => state.selection);
    const assignSlotAsset = (0, useFolioStore_1.useFolioStore)((state) => state.assignSlotAsset);
    if (!project)
        return null;
    const assets = Object.values(project.assets || {});
    const handleDragStart = (e, assetPath) => {
        e.dataTransfer.setData('text/qo-path', assetPath);
        e.dataTransfer.effectAllowed = 'copy';
    };
    const handleClick = (assetPath) => {
        if (selection?.pageId && selection?.blockId) {
            assignSlotAsset(selection.pageId, selection.blockId, assetPath);
        }
    };
    return ((0, jsx_runtime_1.jsxs)("div", { style: { flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { fontSize: '10px', fontFamily: 'JetBrains Mono', color: '#6B7A94', letterSpacing: '0.08em' }, children: ["ASSET TRAY (", assets.length, ")"] }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }, children: assets.map((asset) => ((0, jsx_runtime_1.jsx)("div", { draggable: true, onDragStart: (e) => handleDragStart(e, asset.path), onClick: () => handleClick(asset.path), title: asset.filename, style: {
                        aspectRatio: '1',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        background: '#142A52',
                        border: '1px solid rgba(247, 247, 249, 0.14)',
                        cursor: 'grab',
                        position: 'relative',
                    }, children: (0, jsx_runtime_1.jsx)("img", { src: asset.path, alt: "", style: { width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' } }) }, asset.hash))) })] }));
};
exports.AssetTray = AssetTray;
