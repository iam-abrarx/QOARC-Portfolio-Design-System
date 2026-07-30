"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockPalette = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const CustomDeviceBuilderModal_1 = require("../devices/CustomDeviceBuilderModal");
const custom_device_builder_1 = require("../../../devices/custom-device-builder");
const BlockPalette = () => {
    const [showBuilderModal, setShowBuilderModal] = (0, react_1.useState)(false);
    const [registeredCount, setRegisteredCount] = (0, react_1.useState)(custom_device_builder_1.globalDeviceRegistry.getRegisteredDevices().length);
    const blockTypes = [
        { type: 'sectionHeader', label: 'Section Header', desc: 'Eyebrow + Title header block' },
        { type: 'deviceRow', label: 'Device Row', desc: 'Multi-device responsive mockup grid' },
        { type: 'device', label: 'Device Mockup', desc: 'Single phone/tablet/laptop/desktop frame' },
        { type: 'tableOfContents', label: 'Table of Contents', desc: 'Auto-generated page listing' },
        { type: 'specList', label: 'Spec List', desc: 'Key-value design specification table' },
        { type: 'elevationLadder', label: 'Elevation Ladder', desc: '4 surface elevation rungs' },
        { type: 'buttonMatrix', label: 'Button Matrix', desc: 'Button state specimens' },
    ];
    const handleDeviceRegistered = (device) => {
        setRegisteredCount(custom_device_builder_1.globalDeviceRegistry.getRegisteredDevices().length);
    };
    return ((0, jsx_runtime_1.jsxs)("div", { style: { flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontSize: '10px', fontFamily: 'JetBrains Mono', color: '#6B7A94', letterSpacing: '0.08em', marginBottom: '4px' }, children: "BLOCK PALETTE & FRAMES" }), (0, jsx_runtime_1.jsxs)("button", { onClick: () => setShowBuilderModal(true), style: { padding: '8px 12px', background: 'rgba(45,212,191,0.12)', color: '#2DD4BF', border: '1px solid rgba(45,212,191,0.3)', borderRadius: '6px', fontWeight: 600, fontSize: '11px', cursor: 'pointer', textAlign: 'left', marginBottom: '8px' }, children: ["+ Build Custom Device Frame (", registeredCount, " devices)"] }), blockTypes.map((b) => ((0, jsx_runtime_1.jsxs)("div", { draggable: true, style: {
                    padding: '10px',
                    borderRadius: '6px',
                    background: '#101F3C',
                    border: '1px solid rgba(247,247,249,0.1)',
                    cursor: 'grab',
                }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontSize: '12px', fontWeight: 600, color: '#F7F7F9' }, children: b.label }), (0, jsx_runtime_1.jsx)("div", { style: { fontSize: '10px', color: '#6B7A94', marginTop: '2px' }, children: b.desc })] }, b.type))), showBuilderModal && ((0, jsx_runtime_1.jsx)(CustomDeviceBuilderModal_1.CustomDeviceBuilderModal, { onClose: () => setShowBuilderModal(false), onDeviceRegistered: handleDeviceRegistered }))] }));
};
exports.BlockPalette = BlockPalette;
