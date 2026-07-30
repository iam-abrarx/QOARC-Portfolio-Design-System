"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppShell = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const useFolioStore_1 = require("./store/useFolioStore");
const DocumentCanvas_1 = require("./components/canvas/DocumentCanvas");
const SystemEditor_1 = require("./components/system/SystemEditor");
const AssetTray_1 = require("./components/navigator/AssetTray");
const PageManager_1 = require("./components/navigator/PageManager");
const ProblemsPanel_1 = require("./components/navigator/ProblemsPanel");
const ExportDialog_1 = require("./components/export/ExportDialog");
const CommandPalette_1 = require("./components/palette/CommandPalette");
const TemplateSelection_1 = require("./components/welcome/TemplateSelection");
const AppShell = () => {
    const [activeTab, setActiveTab] = (0, react_1.useState)('canvas');
    const [navTab, setNavTab] = (0, react_1.useState)('pages');
    const [showExportModal, setShowExportModal] = (0, react_1.useState)(false);
    const [showCommandPalette, setShowCommandPalette] = (0, react_1.useState)(false);
    // Horizontal Resize Widths
    const [leftWidth, setLeftWidth] = (0, react_1.useState)(260);
    const [rightWidth, setRightWidth] = (0, react_1.useState)(290);
    const [isResizingLeft, setIsResizingLeft] = (0, react_1.useState)(false);
    const [isResizingRight, setIsResizingRight] = (0, react_1.useState)(false);
    const document = (0, useFolioStore_1.useFolioStore)((state) => state.document);
    const selection = (0, useFolioStore_1.useFolioStore)((state) => state.selection);
    const selectSlot = (0, useFolioStore_1.useFolioStore)((state) => state.selectSlot);
    const updateSlotTransform = (0, useFolioStore_1.useFolioStore)((state) => state.updateSlotTransform);
    const updateBlockSlots = (0, useFolioStore_1.useFolioStore)((state) => state.updateBlockSlots);
    const setProject = (0, useFolioStore_1.useFolioStore)((state) => state.setProject);
    const setSystem = (0, useFolioStore_1.useFolioStore)((state) => state.setSystem);
    const setDocument = (0, useFolioStore_1.useFolioStore)((state) => state.setDocument);
    const system = (0, useFolioStore_1.useFolioStore)((state) => state.system);
    const activeScreen = (0, useFolioStore_1.useFolioStore)((state) => state.activeScreen);
    const setActiveScreen = (0, useFolioStore_1.useFolioStore)((state) => state.setActiveScreen);
    // Undo / Redo Actions and Stacks
    const past = (0, useFolioStore_1.useFolioStore)((state) => state.past);
    const future = (0, useFolioStore_1.useFolioStore)((state) => state.future);
    const undo = (0, useFolioStore_1.useFolioStore)((state) => state.undo);
    const redo = (0, useFolioStore_1.useFolioStore)((state) => state.redo);
    const selectedPage = document?.pages.find((p) => p.id === selection?.pageId);
    const selectedBlock = selectedPage?.blocks.find((b) => b.id === selection?.blockId);
    (0, react_1.useEffect)(() => {
        const handleKeyDown = (e) => {
            // Command Palette (Ctrl+K or Cmd+K)
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setShowCommandPalette((prev) => !prev);
            }
            // Undo (Ctrl+Z or Cmd+Z)
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
            }
            // Redo (Ctrl+Y or Cmd+Y or Cmd+Shift+Z)
            if (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') ||
                ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'z')) {
                e.preventDefault();
                redo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo]);
    (0, react_1.useEffect)(() => {
        const loadDefaultProject = async () => {
            try {
                const cachedDoc = localStorage.getItem('folio_document');
                const cachedSystem = localStorage.getItem('folio_system');
                if (cachedDoc && cachedSystem) {
                    setSystem(JSON.parse(cachedSystem));
                    setDocument(JSON.parse(cachedDoc));
                    return;
                }
            }
            catch (e) {
                console.warn('Failed to load from localStorage cache', e);
            }
            try {
                const basePath = '/dist-folio-project/QOARC.folio/';
                const manifestRes = await fetch(basePath + 'project.json');
                const manifest = await manifestRes.json();
                const systemRes = await fetch(basePath + manifest.systems[0]);
                const system = await systemRes.json();
                const documentRes = await fetch(basePath + manifest.documents[0]);
                const document = await documentRes.json();
                setProject(manifest);
                setSystem(system);
                setDocument(document);
                if (document.pages[0]) {
                    selectSlot({
                        pageId: document.pages[0].id,
                        blockId: document.pages[0].blocks[0]?.id || '',
                    });
                }
            }
            catch (err) {
                console.warn('Failed to auto-load project from PWA web server, trying local path...', err);
                try {
                    const basePath = '../../dist-folio-project/QOARC.folio/';
                    const manifestRes = await fetch(basePath + 'project.json');
                    const manifest = await manifestRes.json();
                    const systemRes = await fetch(basePath + manifest.systems[0]);
                    const system = await systemRes.json();
                    const documentRes = await fetch(basePath + manifest.documents[0]);
                    const document = await documentRes.json();
                    setProject(manifest);
                    setSystem(system);
                    setDocument(document);
                    if (document.pages[0]) {
                        selectSlot({
                            pageId: document.pages[0].id,
                            blockId: document.pages[0].blocks[0]?.id || '',
                        });
                    }
                }
                catch (e) {
                    console.error('Failed to load project fallback', e);
                }
            }
        };
        loadDefaultProject();
    }, [setProject, setSystem, setDocument, selectSlot]);
    // Handle Resize Mouse Events
    (0, react_1.useEffect)(() => {
        const handleMouseMove = (e) => {
            if (isResizingLeft) {
                const newWidth = Math.max(180, Math.min(600, e.clientX));
                setLeftWidth(newWidth);
            }
            if (isResizingRight) {
                const newWidth = Math.max(200, Math.min(600, window.innerWidth - e.clientX));
                setRightWidth(newWidth);
            }
        };
        const handleMouseUp = () => {
            setIsResizingLeft(false);
            setIsResizingRight(false);
        };
        if (isResizingLeft || isResizingRight) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizingLeft, isResizingRight]);
    const handleCommandAction = (actionId) => {
        if (actionId === 'export')
            setShowExportModal(true);
        if (actionId === 'view-canvas')
            setActiveTab('canvas');
        if (actionId === 'view-systems')
            setActiveTab('systems');
        if (actionId === 'nav-problems')
            setNavTab('problems');
    };
    const handleSelectTemplate = async (templateId) => {
        if (templateId === 'qoarc') {
            try {
                const basePath = '/dist-folio-project/QOARC.folio/';
                const manifestRes = await fetch(basePath + 'project.json');
                const manifest = await manifestRes.json();
                const systemRes = await fetch(basePath + manifest.systems[0]);
                const system = await systemRes.json();
                const documentRes = await fetch(basePath + manifest.documents[0]);
                const document = await documentRes.json();
                setProject(manifest);
                setSystem(system);
                setDocument(document);
                localStorage.setItem('folio_document', JSON.stringify(document));
                localStorage.setItem('folio_system', JSON.stringify(system));
                if (document.pages[0]) {
                    selectSlot({
                        pageId: document.pages[0].id,
                        blockId: document.pages[0].blocks[0]?.id || '',
                    });
                }
            }
            catch (err) {
                console.error('Failed to load fresh template project', err);
            }
        }
        setActiveScreen('builder');
    };
    const handleSaveProject = async () => {
        try {
            if (window.folioAPI?.saveProject) {
                await window.folioAPI.saveProject({
                    projectPath: './dist-folio-project/QOARC.folio',
                    document,
                    system,
                });
                alert('🎉 Project Saved Successfully to Disk!');
            }
            else {
                localStorage.setItem('folio_document', JSON.stringify(document));
                localStorage.setItem('folio_system', JSON.stringify(system));
                alert('💾 Project state saved to local browser cache!');
            }
        }
        catch (err) {
            console.error(err);
            alert('Failed to save project.');
        }
    };
    const handleClearCache = () => {
        if (confirm('Are you sure you want to reset all edits and reload the default template?')) {
            localStorage.removeItem('folio_document');
            localStorage.removeItem('folio_system');
            window.location.reload();
        }
    };
    // Welcome Screen
    if (activeScreen === 'welcome') {
        return (0, jsx_runtime_1.jsx)(TemplateSelection_1.TemplateSelection, { onSelectTemplate: handleSelectTemplate });
    }
    return ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', background: '#0D1B33', color: '#F7F7F9', fontFamily: 'Hanken Grotesk, sans-serif' }, children: [(0, jsx_runtime_1.jsxs)("header", { style: { height: '44px', borderBottom: '1px solid rgba(247,247,249,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', background: '#0A1830' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: '12px' }, children: [(0, jsx_runtime_1.jsx)("span", { style: { fontFamily: 'JetBrains Mono', fontWeight: 700, color: '#2DD4BF', fontSize: '13px' }, children: "FOLIO" }), (0, jsx_runtime_1.jsx)("span", { style: { color: '#6B7A94', fontSize: '12px' }, children: "|" }), (0, jsx_runtime_1.jsx)("span", { style: { fontSize: '12px', fontWeight: 600 }, children: document?.title || 'Untitled Project' })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: '12px', alignItems: 'center' }, children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => setShowCommandPalette(true), style: { background: '#101F3C', color: '#6B7A94', border: '1px solid rgba(247,247,249,0.16)', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontFamily: 'JetBrains Mono', cursor: 'pointer' }, children: "\u2318K Command Palette" }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: '8px', background: '#101F3C', padding: '4px', borderRadius: '6px' }, children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => setActiveTab('canvas'), style: {
                                            background: activeTab === 'canvas' ? '#2DD4BF' : 'transparent',
                                            color: activeTab === 'canvas' ? '#0A1830' : '#6B7A94',
                                            border: 'none',
                                            padding: '4px 12px',
                                            borderRadius: '4px',
                                            fontWeight: 600,
                                            fontSize: '11px',
                                            cursor: 'pointer',
                                        }, children: "Document Canvas" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setActiveTab('systems'), style: {
                                            background: activeTab === 'systems' ? '#2DD4BF' : 'transparent',
                                            color: activeTab === 'systems' ? '#0A1830' : '#6B7A94',
                                            border: 'none',
                                            padding: '4px 12px',
                                            borderRadius: '4px',
                                            fontWeight: 600,
                                            fontSize: '11px',
                                            cursor: 'pointer',
                                        }, children: "Design System Manager" })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: '8px', alignItems: 'center' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', background: '#101F3C', padding: '2px', borderRadius: '6px', border: '1px solid rgba(247,247,249,0.12)' }, children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => undo(), disabled: past.length === 0, style: {
                                                    background: 'transparent',
                                                    color: past.length > 0 ? '#2DD4BF' : '#6B7A94',
                                                    border: 'none',
                                                    padding: '4px 10px',
                                                    borderRadius: '4px',
                                                    fontSize: '11px',
                                                    cursor: past.length > 0 ? 'pointer' : 'not-allowed',
                                                    fontWeight: 600,
                                                }, title: "Undo last action (Ctrl+Z)", children: "\u21B6 Undo" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => redo(), disabled: future.length === 0, style: {
                                                    background: 'transparent',
                                                    color: future.length > 0 ? '#2DD4BF' : '#6B7A94',
                                                    border: 'none',
                                                    padding: '4px 10px',
                                                    borderRadius: '4px',
                                                    fontSize: '11px',
                                                    cursor: future.length > 0 ? 'pointer' : 'not-allowed',
                                                    fontWeight: 600,
                                                }, title: "Redo last action (Ctrl+Y)", children: "Redo \u21B7" })] }), (0, jsx_runtime_1.jsx)("button", { onClick: handleSaveProject, style: { background: '#1E2F50', color: '#2DD4BF', border: '1px solid rgba(45,212,191,0.3)', padding: '6px 14px', borderRadius: '6px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }, children: "\uD83D\uDCBE Save" }), (0, jsx_runtime_1.jsx)("button", { onClick: handleClearCache, style: { background: 'transparent', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }, title: "Reset all edits", children: "Reset" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setShowExportModal(true), style: { background: '#2DD4BF', color: '#0A1830', border: 'none', padding: '6px 14px', borderRadius: '6px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }, children: "Export \u25BE" })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { style: { flex: 1, display: 'flex', overflow: 'hidden' }, children: [(0, jsx_runtime_1.jsxs)("aside", { style: { width: `${leftWidth}px`, minWidth: '180px', maxWidth: '600px', borderRight: '1px solid rgba(247,247,249,0.12)', background: '#0A1830', display: 'flex', flexDirection: 'column', userSelect: isResizingLeft ? 'none' : 'auto' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', borderBottom: '1px solid rgba(247,247,249,0.12)', background: '#071020' }, children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => setNavTab('pages'), style: {
                                            flex: 1,
                                            padding: '8px 0',
                                            border: 'none',
                                            background: navTab === 'pages' ? '#0A1830' : 'transparent',
                                            color: navTab === 'pages' ? '#2DD4BF' : '#6B7A94',
                                            fontSize: '9px',
                                            fontFamily: 'JetBrains Mono',
                                            cursor: 'pointer',
                                        }, children: "PAGES" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setNavTab('assets'), style: {
                                            flex: 1,
                                            padding: '8px 0',
                                            border: 'none',
                                            background: navTab === 'assets' ? '#0A1830' : 'transparent',
                                            color: navTab === 'assets' ? '#2DD4BF' : '#6B7A94',
                                            fontSize: '9px',
                                            fontFamily: 'JetBrains Mono',
                                            cursor: 'pointer',
                                        }, children: "ASSETS" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setNavTab('problems'), style: {
                                            flex: 1,
                                            padding: '8px 0',
                                            border: 'none',
                                            background: navTab === 'problems' ? '#0A1830' : 'transparent',
                                            color: navTab === 'problems' ? '#2DD4BF' : '#6B7A94',
                                            fontSize: '9px',
                                            fontFamily: 'JetBrains Mono',
                                            cursor: 'pointer',
                                        }, children: "LINT" })] }), (0, jsx_runtime_1.jsxs)("div", { style: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }, children: [navTab === 'pages' && (0, jsx_runtime_1.jsx)(PageManager_1.PageManager, {}), navTab === 'assets' && (0, jsx_runtime_1.jsx)(AssetTray_1.AssetTray, {}), navTab === 'problems' && (0, jsx_runtime_1.jsx)(ProblemsPanel_1.ProblemsPanel, {})] })] }), (0, jsx_runtime_1.jsx)("div", { onMouseDown: () => setIsResizingLeft(true), style: {
                            width: '6px',
                            cursor: 'col-resize',
                            background: isResizingLeft ? '#2DD4BF' : 'transparent',
                            zIndex: 10,
                            transition: 'background 150ms',
                            alignSelf: 'stretch',
                        }, title: "Drag to resize panel" }), (0, jsx_runtime_1.jsx)("main", { style: { flex: 1, display: 'flex', flexDirection: 'column', background: '#071020', overflow: 'hidden' }, children: activeTab === 'canvas' ? (0, jsx_runtime_1.jsx)(DocumentCanvas_1.DocumentCanvas, {}) : (0, jsx_runtime_1.jsx)(SystemEditor_1.SystemEditor, {}) }), (0, jsx_runtime_1.jsx)("div", { onMouseDown: () => setIsResizingRight(true), style: {
                            width: '6px',
                            cursor: 'col-resize',
                            background: isResizingRight ? '#2DD4BF' : 'transparent',
                            zIndex: 10,
                            transition: 'background 150ms',
                            alignSelf: 'stretch',
                        }, title: "Drag to resize panel" }), (0, jsx_runtime_1.jsxs)("aside", { style: { width: `${rightWidth}px`, minWidth: '200px', maxWidth: '600px', borderLeft: '1px solid rgba(247,247,249,0.12)', background: '#0A1830', padding: '16px', overflowY: 'auto', userSelect: isResizingRight ? 'none' : 'auto' }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontSize: '10px', fontFamily: 'JetBrains Mono', color: '#6B7A94', letterSpacing: '0.08em', marginBottom: '16px' }, children: "INSPECTOR & CONTENT EDITOR" }), selectedBlock && selection ? ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexDirection: 'column', gap: '16px' }, children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { style: { fontSize: '13px', fontWeight: 700, color: '#2DD4BF' }, children: selectedBlock.type }), (0, jsx_runtime_1.jsx)("div", { style: { fontSize: '10px', color: '#6B7A94', fontFamily: 'JetBrains Mono' }, children: selectedBlock.id })] }), selectedBlock.slots?.title !== undefined && ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { style: { fontSize: '10px', fontFamily: 'JetBrains Mono', color: '#6B7A94' }, children: "TITLE TEXT" }), (0, jsx_runtime_1.jsx)("input", { type: "text", value: typeof selectedBlock.slots.title === 'string' ? selectedBlock.slots.title : '', onChange: (e) => updateBlockSlots(selection.pageId, selectedBlock.id, { title: e.target.value }), style: { width: '100%', padding: '6px 8px', background: '#101F3C', border: '1px solid rgba(247,247,249,0.15)', borderRadius: '6px', color: '#F7F7F9', fontSize: '12px' } })] })), selectedBlock.slots?.eyebrow !== undefined && ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { style: { fontSize: '10px', fontFamily: 'JetBrains Mono', color: '#6B7A94' }, children: "EYEBROW TEXT" }), (0, jsx_runtime_1.jsx)("input", { type: "text", value: typeof selectedBlock.slots.eyebrow === 'string' ? selectedBlock.slots.eyebrow : '', onChange: (e) => updateBlockSlots(selection.pageId, selectedBlock.id, { eyebrow: e.target.value }), style: { width: '100%', padding: '6px 8px', background: '#101F3C', border: '1px solid rgba(247,247,249,0.15)', borderRadius: '6px', color: '#F7F7F9', fontSize: '12px' } })] })), selectedBlock.slots?.body !== undefined && ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { style: { fontSize: '10px', fontFamily: 'JetBrains Mono', color: '#6B7A94' }, children: "PARAGRAPH BODY" }), (0, jsx_runtime_1.jsx)("textarea", { rows: 3, value: typeof selectedBlock.slots.body === 'string' ? selectedBlock.slots.body : '', onChange: (e) => updateBlockSlots(selection.pageId, selectedBlock.id, { body: e.target.value }), style: { width: '100%', padding: '6px 8px', background: '#101F3C', border: '1px solid rgba(247,247,249,0.15)', borderRadius: '6px', color: '#F7F7F9', fontSize: '12px', resize: 'vertical' } })] })), selectedBlock.slots?.screen && typeof selectedBlock.slots.screen === 'object' && ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexDirection: 'column', gap: '12px' }, children: [(0, jsx_runtime_1.jsx)("label", { style: { fontSize: '10px', fontFamily: 'JetBrains Mono', color: '#6B7A94' }, children: "SLOT TRANSFORM" }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { style: { fontSize: '11px', color: '#6B7A94' }, children: "Nudge X" }), (0, jsx_runtime_1.jsx)("input", { type: "range", min: "-400", max: "400", value: selectedBlock.slots.screen.transform?.x || 0, onChange: (e) => updateSlotTransform(selection.pageId, selectedBlock.id, { x: Number(e.target.value) }), style: { width: '100%', accentColor: '#2DD4BF' } })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { style: { fontSize: '11px', color: '#6B7A94' }, children: "Nudge Y" }), (0, jsx_runtime_1.jsx)("input", { type: "range", min: "-600", max: "600", value: selectedBlock.slots.screen.transform?.y || 0, onChange: (e) => updateSlotTransform(selection.pageId, selectedBlock.id, { y: Number(e.target.value) }), style: { width: '100%', accentColor: '#2DD4BF' } })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { style: { fontSize: '11px', color: '#6B7A94' }, children: "Zoom" }), (0, jsx_runtime_1.jsx)("input", { type: "range", min: "50", max: "300", value: Math.round((selectedBlock.slots.screen.transform?.z || 1) * 100), onChange: (e) => updateSlotTransform(selection.pageId, selectedBlock.id, { z: Number(e.target.value) / 100 }), style: { width: '100%', accentColor: '#2DD4BF' } })] })] }))] })) : ((0, jsx_runtime_1.jsx)("div", { style: { fontSize: '12px', color: '#6B7A94', fontStyle: 'italic' }, children: "Select a page or block on the canvas to edit properties." }))] })] }), showExportModal && (0, jsx_runtime_1.jsx)(ExportDialog_1.ExportDialog, { onClose: () => setShowExportModal(false) }), showCommandPalette && (0, jsx_runtime_1.jsx)(CommandPalette_1.CommandPalette, { onClose: () => setShowCommandPalette(false), onSelectAction: handleCommandAction })] }));
};
exports.AppShell = AppShell;
