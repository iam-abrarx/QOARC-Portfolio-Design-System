"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpecListBlock = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const SpecListBlock = ({ block }) => {
    const items = block.props?.items || [
        { key: 'Container max', val: '1440 px' },
        { key: 'Gutter', val: '24 px' },
        { key: 'Section rhythm', val: '64 → 144 px' },
    ];
    return ((0, jsx_runtime_1.jsx)("div", { className: "qo-spec", style: { marginTop: 'var(--qo-space-md, 24px)' }, children: items.map((item, idx) => ((0, jsx_runtime_1.jsxs)("div", { className: "qo-spec__row", children: [(0, jsx_runtime_1.jsx)("span", { className: "qo-spec__key", children: item.key }), (0, jsx_runtime_1.jsx)("span", { className: "qo-spec__val", children: item.val })] }, idx))) }));
};
exports.SpecListBlock = SpecListBlock;
