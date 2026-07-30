"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComponentsPalette = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const useFolioStore_1 = require("../../store/useFolioStore");
const ComponentsPalette = () => {
    const selection = (0, useFolioStore_1.useFolioStore)((state) => state.selection);
    const document = (0, useFolioStore_1.useFolioStore)((state) => state.document);
    const addBlockToPage = (0, useFolioStore_1.useFolioStore)((state) => state.addBlockToPage);
    const targetPageId = selection?.pageId || document?.pages[0]?.id || '';
    const components = [
        // Typography
        {
            category: 'TYPOGRAPHY',
            items: [
                { label: 'Hero Heading (H1)', type: 'textBlock', slots: { title: 'Hero Portfolio Case Study', body: 'Subtitle paragraph describing the project vision and scope.' } },
                { label: 'Section Title (H2)', type: 'sectionHeader', slots: { eyebrow: 'FEATURE OVERVIEW', title: 'System Architecture & Flow' } },
                { label: 'Body Paragraph', type: 'textBlock', slots: { body: 'Detailed paragraph text introducing key design constraints, rationale, and metric outcomes.' } },
                { label: 'Mono Spec / Caption', type: 'textBlock', slots: { body: 'SPEC_01 // 297mm × 210mm A4 Landscape Page Format' } },
                { label: 'Pull Quote / Callout', type: 'textBlock', slots: { body: '"Good design system governance makes high-velocity iteration predictable."' } },
            ],
        },
        // Media Holders
        {
            category: 'MEDIA HOLDERS',
            items: [
                { label: 'Image Holder (16:9)', type: 'imageHolder', props: { aspectRatio: '16/9' }, slots: { caption: '16:9 Landscape Screen Capture' } },
                { label: 'Image Holder (4:3)', type: 'imageHolder', props: { aspectRatio: '4/3' }, slots: { caption: '4:3 Standard Aspect Screen Capture' } },
                { label: 'Image Holder (1:1 Square)', type: 'imageHolder', props: { aspectRatio: '1/1' }, slots: { caption: '1:1 Square Specimen Thumbnail' } },
            ],
        },
        // UI Primitives
        {
            category: 'UI PRIMITIVES',
            items: [
                { label: 'Pill / Tag Badge', type: 'textBlock', slots: { body: '[ ⚡ LIVE SPECIMEN ]' } },
                { label: 'Elevation Ladder', type: 'elevationLadder', slots: {} },
                { label: 'Button Matrix', type: 'buttonMatrix', slots: {} },
                { label: 'Spec List Table', type: 'specList', slots: {} },
            ],
        },
    ];
    const handleInsert = (item) => {
        if (!targetPageId)
            return;
        const newBlock = {
            id: `bk_${Date.now()}`,
            type: item.type,
            props: item.props || {},
            slots: item.slots || {},
        };
        addBlockToPage(targetPageId, newBlock);
    };
    return ((0, jsx_runtime_1.jsxs)("div", { style: { flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontSize: '10px', fontFamily: 'JetBrains Mono', color: '#6B7A94', letterSpacing: '0.08em' }, children: "ATOMIC COMPONENTS PALETTE" }), components.map((group) => ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexDirection: 'column', gap: '6px' }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontSize: '9px', fontFamily: 'JetBrains Mono', color: '#2DD4BF', letterSpacing: '0.05em' }, children: group.category }), group.items.map((item, idx) => ((0, jsx_runtime_1.jsxs)("div", { onClick: () => handleInsert(item), style: {
                            padding: '8px 10px',
                            borderRadius: '6px',
                            background: '#101F3C',
                            border: '1px solid rgba(247,247,249,0.1)',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }, onMouseEnter: (e) => (e.currentTarget.style.borderColor = '#2DD4BF'), onMouseLeave: (e) => (e.currentTarget.style.borderColor = 'rgba(247,247,249,0.1)'), children: [(0, jsx_runtime_1.jsx)("span", { style: { fontSize: '11.5px', color: '#F7F7F9', fontWeight: 500 }, children: item.label }), (0, jsx_runtime_1.jsx)("span", { style: { fontSize: '11px', color: '#2DD4BF' }, children: "+" })] }, idx)))] }, group.category)))] }));
};
exports.ComponentsPalette = ComponentsPalette;
