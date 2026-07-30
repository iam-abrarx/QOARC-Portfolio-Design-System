"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomDeviceBuilderModal = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const custom_device_builder_1 = require("../../../devices/custom-device-builder");
const CustomDeviceBuilderModal = ({ onClose, onDeviceRegistered }) => {
    const [id, setId] = (0, react_1.useState)('device_smartwatch');
    const [name, setName] = (0, react_1.useState)('Apple Watch Ultra 2');
    const [kind, setKind] = (0, react_1.useState)('watch');
    const [aspectW, setAspectW] = (0, react_1.useState)(410);
    const [aspectH, setAspectH] = (0, react_1.useState)(502);
    const [borderRadius, setBorderRadius] = (0, react_1.useState)('32px');
    const [statusMsg, setStatusMsg] = (0, react_1.useState)('');
    const handleRegister = () => {
        try {
            const newDevice = {
                id,
                name,
                kind,
                aspectRatio: { width: Number(aspectW), height: Number(aspectH) },
                screenBounds: { top: '0', left: '0', width: '100%', height: '100%', borderRadius },
            };
            const registered = custom_device_builder_1.globalDeviceRegistry.registerCustomDevice(newDevice);
            onDeviceRegistered(registered);
            setStatusMsg(`Registered ${registered.name} successfully!`);
            setTimeout(() => onClose(), 800);
        }
        catch (err) {
            setStatusMsg(`Error: ${err.message}`);
        }
    };
    return ((0, jsx_runtime_1.jsx)("div", { style: { position: 'fixed', inset: 0, background: 'rgba(10,24,48,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }, children: (0, jsx_runtime_1.jsxs)("div", { style: { width: '520px', background: '#0D1B33', border: '1px solid rgba(247,247,249,0.2)', borderRadius: '12px', padding: '24px', color: '#F7F7F9', display: 'flex', flexDirection: 'column', gap: '16px' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(247,247,249,0.1)', paddingBottom: '12px' }, children: [(0, jsx_runtime_1.jsx)("h3", { style: { margin: 0, fontSize: '16px', fontFamily: 'JetBrains Mono', color: '#2DD4BF' }, children: "CUSTOM DEVICE FRAME BUILDER" }), (0, jsx_runtime_1.jsx)("button", { onClick: onClose, style: { background: 'transparent', border: 'none', color: '#6B7A94', fontSize: '20px', cursor: 'pointer' }, children: "\u00D7" })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }, children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { style: { fontSize: '10px', fontFamily: 'JetBrains Mono', color: '#6B7A94' }, children: "DEVICE ID" }), (0, jsx_runtime_1.jsx)("input", { type: "text", value: id, onChange: (e) => setId(e.target.value), style: { width: '100%', padding: '8px', background: '#101F3C', border: '1px solid rgba(247,247,249,0.15)', borderRadius: '6px', color: '#F7F7F9', fontSize: '12px' } })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { style: { fontSize: '10px', fontFamily: 'JetBrains Mono', color: '#6B7A94' }, children: "DEVICE NAME" }), (0, jsx_runtime_1.jsx)("input", { type: "text", value: name, onChange: (e) => setName(e.target.value), style: { width: '100%', padding: '8px', background: '#101F3C', border: '1px solid rgba(247,247,249,0.15)', borderRadius: '6px', color: '#F7F7F9', fontSize: '12px' } })] })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }, children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { style: { fontSize: '10px', fontFamily: 'JetBrains Mono', color: '#6B7A94' }, children: "ASPECT WIDTH" }), (0, jsx_runtime_1.jsx)("input", { type: "number", value: aspectW, onChange: (e) => setAspectW(Number(e.target.value)), style: { width: '100%', padding: '8px', background: '#101F3C', border: '1px solid rgba(247,247,249,0.15)', borderRadius: '6px', color: '#F7F7F9', fontSize: '12px' } })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { style: { fontSize: '10px', fontFamily: 'JetBrains Mono', color: '#6B7A94' }, children: "ASPECT HEIGHT" }), (0, jsx_runtime_1.jsx)("input", { type: "number", value: aspectH, onChange: (e) => setAspectH(Number(e.target.value)), style: { width: '100%', padding: '8px', background: '#101F3C', border: '1px solid rgba(247,247,249,0.15)', borderRadius: '6px', color: '#F7F7F9', fontSize: '12px' } })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { style: { fontSize: '10px', fontFamily: 'JetBrains Mono', color: '#6B7A94' }, children: "CORNER RADIUS" }), (0, jsx_runtime_1.jsx)("input", { type: "text", value: borderRadius, onChange: (e) => setBorderRadius(e.target.value), style: { width: '100%', padding: '8px', background: '#101F3C', border: '1px solid rgba(247,247,249,0.15)', borderRadius: '6px', color: '#F7F7F9', fontSize: '12px' } })] })] }), (0, jsx_runtime_1.jsxs)("div", { style: { padding: '16px', background: '#071020', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontSize: '10px', fontFamily: 'JetBrains Mono', color: '#6B7A94' }, children: "LIVE FRAME SPECIMEN PREVIEW" }), (0, jsx_runtime_1.jsx)("div", { style: {
                                width: '120px',
                                aspectRatio: `${aspectW} / ${aspectH}`,
                                background: '#2B303A',
                                border: '2px solid #545C6C',
                                borderRadius: borderRadius,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                            }, children: (0, jsx_runtime_1.jsxs)("span", { style: { fontSize: '9px', color: '#6B7A94', fontFamily: 'JetBrains Mono' }, children: [aspectW, " \u00D7 ", aspectH] }) })] }), statusMsg && (0, jsx_runtime_1.jsx)("div", { style: { fontSize: '11px', color: '#2DD4BF', fontFamily: 'JetBrains Mono' }, children: statusMsg }), (0, jsx_runtime_1.jsx)("button", { onClick: handleRegister, style: { padding: '12px', background: '#2DD4BF', color: '#0A1830', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }, children: "Save & Register Device" })] }) }));
};
exports.CustomDeviceBuilderModal = CustomDeviceBuilderModal;
