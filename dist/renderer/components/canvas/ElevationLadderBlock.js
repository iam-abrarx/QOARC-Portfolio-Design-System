"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElevationLadderBlock = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const ElevationLadderBlock = () => {
    return ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--qo-space-lg, 32px)', margin: '24px 0' }, children: [(0, jsx_runtime_1.jsxs)("div", { className: "qo-elev qo-elev--0", style: { minHeight: '44mm' }, children: [(0, jsx_runtime_1.jsx)("span", { className: "qo-badge", children: "elev 0" }), (0, jsx_runtime_1.jsx)("span", { className: "qo-swatch__hex", children: "Page background" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "qo-elev qo-elev--1", style: { minHeight: '44mm' }, children: [(0, jsx_runtime_1.jsx)("span", { className: "qo-badge", children: "elev 1" }), (0, jsx_runtime_1.jsx)("span", { className: "qo-swatch__hex", children: "Resting panels" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "qo-elev qo-elev--2", style: { minHeight: '44mm' }, children: [(0, jsx_runtime_1.jsx)("span", { className: "qo-badge", children: "elev 2" }), (0, jsx_runtime_1.jsx)("span", { className: "qo-swatch__hex", children: "Cards, hover" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "qo-elev qo-elev--3", style: { minHeight: '44mm' }, children: [(0, jsx_runtime_1.jsx)("span", { className: "qo-badge", children: "elev 3" }), (0, jsx_runtime_1.jsx)("span", { className: "qo-swatch__hex", children: "Popovers, pressed" })] })] }));
};
exports.ElevationLadderBlock = ElevationLadderBlock;
