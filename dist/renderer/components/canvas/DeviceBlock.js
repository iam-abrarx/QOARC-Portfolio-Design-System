"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceBlock = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const useFolioStore_1 = require("../../store/useFolioStore");
const DeviceBlock = ({ block, pageId }) => {
    const selection = (0, useFolioStore_1.useFolioStore)((state) => state.selection);
    const selectSlot = (0, useFolioStore_1.useFolioStore)((state) => state.selectSlot);
    const updateSlotTransform = (0, useFolioStore_1.useFolioStore)((state) => state.updateSlotTransform);
    const kind = block.props?.kind || 'phone';
    const view = block.props?.view || 'front';
    const screenSlot = block.slots?.screen;
    const imgSrc = screenSlot?.asset;
    const fit = screenSlot?.fit || 'cover';
    const transform = screenSlot?.transform || { x: 0, y: 0, z: 1 };
    const isSelected = selection?.pageId === pageId && selection?.blockId === block.id;
    const [isDragging, setIsDragging] = (0, react_1.useState)(false);
    const dragStartRef = (0, react_1.useRef)(null);
    const handleMouseDown = (e) => {
        e.stopPropagation();
        selectSlot({ pageId, blockId: block.id });
        if (!imgSrc)
            return;
        setIsDragging(true);
        dragStartRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            initialX: transform.x || 0,
            initialY: transform.y || 0,
        };
    };
    const handleMouseMove = (e) => {
        if (!isDragging || !dragStartRef.current)
            return;
        const dx = e.clientX - dragStartRef.current.startX;
        const dy = e.clientY - dragStartRef.current.startY;
        updateSlotTransform(pageId, block.id, {
            x: dragStartRef.current.initialX + dx,
            y: dragStartRef.current.initialY + dy,
        });
    };
    const handleMouseUp = () => {
        setIsDragging(false);
        dragStartRef.current = null;
    };
    const handleWheel = (e) => {
        if (!imgSrc || !isSelected)
            return;
        e.stopPropagation();
        const currentZ = transform.z || 1;
        const delta = e.deltaY < 0 ? 0.05 : -0.05;
        const newZ = Math.min(3, Math.max(0.5, currentZ + delta));
        updateSlotTransform(pageId, block.id, { z: newZ });
    };
    const deviceClass = `qo-device qo-device--${kind} qo-view--${view} ${isSelected ? 'qb-sel' : ''}`;
    const screenFitClass = fit === 'fit-width' ? 'qo-screen--fit-width' : fit === 'auto' ? 'qo-screen--auto' : '';
    const imgStyle = {
        transform: `translate(${transform.x || 0}px, ${transform.y || 0}px) scale(${transform.z || 1})`,
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: deviceClass, onClick: () => selectSlot({ pageId, blockId: block.id }), children: [(0, jsx_runtime_1.jsx)("div", { className: "qo-device__frame", children: (0, jsx_runtime_1.jsx)("div", { className: `qo-screen ${screenFitClass}`, onMouseDown: handleMouseDown, onMouseMove: handleMouseMove, onMouseUp: handleMouseUp, onWheel: handleWheel, children: imgSrc && (0, jsx_runtime_1.jsx)("img", { src: imgSrc, alt: "", style: imgStyle, draggable: false }) }) }), kind === 'laptop' && (0, jsx_runtime_1.jsx)("div", { className: "qo-device__base" }), kind === 'desktop' && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { className: "qo-device__neck" }), (0, jsx_runtime_1.jsx)("div", { className: "qo-device__foot" })] })), block.slots?.label && typeof block.slots.label === 'string' && ((0, jsx_runtime_1.jsx)("p", { className: "qo-device__label", children: block.slots.label }))] }));
};
exports.DeviceBlock = DeviceBlock;
