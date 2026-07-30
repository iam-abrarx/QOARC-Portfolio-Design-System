"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandPalette = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const CommandPalette = ({ onClose, onSelectAction }) => {
    const [query, setQuery] = (0, react_1.useState)('');
    const commands = [
        { id: 'export', title: 'Export Document (PDF / HTML / Tokens)', category: 'Export' },
        { id: 'view-canvas', title: 'Switch to Document Canvas', category: 'View' },
        { id: 'view-systems', title: 'Switch to Design System Manager', category: 'View' },
        { id: 'nav-problems', title: 'Run Design Lint Check', category: 'Lint' },
        { id: 'theme-dark', title: 'Switch Theme to Dark', category: 'Theme' },
        { id: 'theme-light', title: 'Switch Theme to Light', category: 'Theme' },
        { id: 'add-device', title: 'Insert Device Mockup Block', category: 'Blocks' },
        { id: 'add-header', title: 'Insert Section Header Block', category: 'Blocks' },
    ];
    const filteredCommands = commands.filter((c) => c.title.toLowerCase().includes(query.toLowerCase()) || c.category.toLowerCase().includes(query.toLowerCase()));
    (0, react_1.useEffect)(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape')
                onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);
    return ((0, jsx_runtime_1.jsx)("div", { style: { position: 'fixed', inset: 0, background: 'rgba(10,24,48,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '15vh', zIndex: 9999 }, children: (0, jsx_runtime_1.jsxs)("div", { style: { width: '560px', background: '#0D1B33', border: '1px solid rgba(247,247,249,0.2)', borderRadius: '12px', boxShadow: '0 20px 50px rgba(0,0,0,0.6)', overflow: 'hidden' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { padding: '16px', borderBottom: '1px solid rgba(247,247,249,0.12)', display: 'flex', alignItems: 'center', gap: '12px' }, children: [(0, jsx_runtime_1.jsx)("span", { style: { fontFamily: 'JetBrains Mono', color: '#2DD4BF', fontWeight: 700 }, children: "\u2318K" }), (0, jsx_runtime_1.jsx)("input", { autoFocus: true, type: "text", placeholder: "Type a command or search actions\u2026", value: query, onChange: (e) => setQuery(e.target.value), style: { width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#F7F7F9', fontSize: '14px', fontFamily: 'Hanken Grotesk, sans-serif' } })] }), (0, jsx_runtime_1.jsx)("div", { style: { maxHeight: '320px', overflowY: 'auto', padding: '8px' }, children: filteredCommands.length === 0 ? ((0, jsx_runtime_1.jsx)("div", { style: { padding: '16px', fontSize: '12px', color: '#6B7A94', textAlign: 'center' }, children: "No matching commands found" })) : (filteredCommands.map((cmd) => ((0, jsx_runtime_1.jsxs)("div", { onClick: () => {
                            onSelectAction(cmd.id);
                            onClose();
                        }, style: { padding: '10px 14px', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '2px 0' }, onMouseEnter: (e) => (e.currentTarget.style.background = '#101F3C'), onMouseLeave: (e) => (e.currentTarget.style.background = 'transparent'), children: [(0, jsx_runtime_1.jsx)("span", { style: { fontSize: '13px', color: '#F7F7F9', fontWeight: 500 }, children: cmd.title }), (0, jsx_runtime_1.jsx)("span", { style: { fontSize: '10px', fontFamily: 'JetBrains Mono', color: '#6B7A94', textTransform: 'uppercase' }, children: cmd.category })] }, cmd.id)))) })] }) }));
};
exports.CommandPalette = CommandPalette;
