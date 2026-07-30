"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TableOfContentsBlock = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const useFolioStore_1 = require("../../store/useFolioStore");
const TableOfContentsBlock = () => {
    const document = (0, useFolioStore_1.useFolioStore)((state) => state.document);
    if (!document)
        return null;
    const tocEntries = [];
    document.pages.forEach((page, idx) => {
        const headBlock = page.blocks.find((b) => b.type === 'sectionHeader');
        if (headBlock && headBlock.slots?.title && typeof headBlock.slots.title === 'string') {
            tocEntries.push({
                num: String(tocEntries.length + 1).padStart(2, '0'),
                title: headBlock.slots.title,
                desc: typeof headBlock.slots?.eyebrow === 'string' ? headBlock.slots.eyebrow : '',
                pageNum: String(idx + 1).padStart(2, '0'),
            });
        }
    });
    return ((0, jsx_runtime_1.jsx)("div", { className: "qo-contents", style: { marginTop: 'var(--qo-space-lg, 32px)' }, children: tocEntries.map((entry) => ((0, jsx_runtime_1.jsxs)("div", { className: "qo-contents__row", children: [(0, jsx_runtime_1.jsx)("span", { className: "qo-contents__num", children: entry.num }), (0, jsx_runtime_1.jsx)("span", { className: "qo-contents__name", children: entry.title }), (0, jsx_runtime_1.jsx)("span", { className: "qo-contents__desc", children: entry.desc }), (0, jsx_runtime_1.jsx)("span", { className: "qo-contents__leader" }), (0, jsx_runtime_1.jsx)("span", { className: "qo-contents__folio", children: entry.pageNum })] }, entry.num))) }));
};
exports.TableOfContentsBlock = TableOfContentsBlock;
