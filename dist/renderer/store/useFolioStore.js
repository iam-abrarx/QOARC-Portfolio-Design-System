"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useFolioStore = void 0;
const zustand_1 = require("zustand");
const immer_1 = require("immer");
const saveToHistory = (state) => {
    if (state.document) {
        // Keep stack size limited to 50 items for memory safety
        if (state.past.length >= 50) {
            state.past.shift();
        }
        state.past.push(JSON.parse(JSON.stringify(state.document)));
        state.future = [];
    }
};
exports.useFolioStore = (0, zustand_1.create)((set) => ({
    project: null,
    system: null,
    document: null,
    selection: null,
    activeScreen: 'welcome',
    past: [],
    future: [],
    setActiveScreen: (activeScreen) => set({ activeScreen }),
    setProject: (project) => set({ project }),
    setSystem: (system) => set({ system }),
    setDocument: (document) => set({ document }),
    selectSlot: (selection) => set({ selection }),
    undo: () => set((0, immer_1.produce)((state) => {
        if (state.past.length === 0)
            return;
        const previous = state.past.pop();
        if (previous && state.document) {
            state.future.push(JSON.parse(JSON.stringify(state.document)));
            state.document = previous;
        }
    })),
    redo: () => set((0, immer_1.produce)((state) => {
        if (state.future.length === 0)
            return;
        const next = state.future.pop();
        if (next && state.document) {
            state.past.push(JSON.parse(JSON.stringify(state.document)));
            state.document = next;
        }
    })),
    updateSlotTransform: (pageId, blockId, transform) => set((0, immer_1.produce)((state) => {
        saveToHistory(state);
        if (!state.document)
            return;
        const page = state.document.pages.find((p) => p.id === pageId);
        if (!page)
            return;
        const findAndApplyBlock = (blocks) => {
            for (const b of blocks) {
                if (b.id === blockId && b.slots?.screen) {
                    if (!b.slots.screen.transform)
                        b.slots.screen.transform = { x: 0, y: 0, z: 1 };
                    if (transform.x !== undefined)
                        b.slots.screen.transform.x = transform.x;
                    if (transform.y !== undefined)
                        b.slots.screen.transform.y = transform.y;
                    if (transform.z !== undefined)
                        b.slots.screen.transform.z = transform.z;
                    return true;
                }
                if (b.children) {
                    if (findAndApplyBlock(b.children))
                        return true;
                }
            }
            return false;
        };
        findAndApplyBlock(page.blocks);
    })),
    assignSlotAsset: (pageId, blockId, assetPath) => set((0, immer_1.produce)((state) => {
        saveToHistory(state);
        if (!state.document)
            return;
        const page = state.document.pages.find((p) => p.id === pageId);
        if (!page)
            return;
        const findAndAssign = (blocks) => {
            for (const b of blocks) {
                if (b.id === blockId && b.slots?.screen) {
                    b.slots.screen.asset = assetPath;
                    return true;
                }
                if (b.children) {
                    if (findAndAssign(b.children))
                        return true;
                }
            }
            return false;
        };
        findAndAssign(page.blocks);
    })),
    updateTokenColor: (tokenKey, newValue) => set((0, immer_1.produce)((state) => {
        if (!state.system || !state.system.tokens.color[tokenKey])
            return;
        state.system.tokens.color[tokenKey].$value = newValue;
    })),
    addPage: (theme = 'dark') => set((0, immer_1.produce)((state) => {
        saveToHistory(state);
        if (!state.document)
            return;
        const pageIndex = state.document.pages.length + 1;
        const newPage = {
            id: `pg_${Date.now()}`,
            theme,
            folio: { show: true, label: `${String(pageIndex).padStart(2, '0')} — New Page` },
            blocks: [
                {
                    id: `bk_header_${Date.now()}`,
                    type: 'sectionHeader',
                    slots: { eyebrow: 'NEW SECTION', title: 'Untitled Page Title' },
                },
            ],
        };
        state.document.pages.push(newPage);
    })),
    removePage: (pageId) => set((0, immer_1.produce)((state) => {
        saveToHistory(state);
        if (!state.document || state.document.pages.length <= 1)
            return;
        state.document.pages = state.document.pages.filter((p) => p.id !== pageId);
    })),
    reorderPage: (pageId, direction) => set((0, immer_1.produce)((state) => {
        saveToHistory(state);
        if (!state.document)
            return;
        const idx = state.document.pages.findIndex((p) => p.id === pageId);
        if (idx === -1)
            return;
        const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= state.document.pages.length)
            return;
        const temp = state.document.pages[idx];
        state.document.pages[idx] = state.document.pages[targetIdx];
        state.document.pages[targetIdx] = temp;
    })),
    updatePageLabel: (pageId, label) => set((0, immer_1.produce)((state) => {
        saveToHistory(state);
        if (!state.document)
            return;
        const page = state.document.pages.find((p) => p.id === pageId);
        if (page) {
            if (!page.folio)
                page.folio = { show: true, label };
            else
                page.folio.label = label;
        }
    })),
    updatePageTheme: (pageId, theme) => set((0, immer_1.produce)((state) => {
        saveToHistory(state);
        if (!state.document)
            return;
        const page = state.document.pages.find((p) => p.id === pageId);
        if (page) {
            page.theme = theme;
        }
    })),
    addBlockToPage: (pageId, block) => set((0, immer_1.produce)((state) => {
        saveToHistory(state);
        if (!state.document)
            return;
        const page = state.document.pages.find((p) => p.id === pageId);
        if (page) {
            page.blocks.push(block);
        }
    })),
    removeBlock: (pageId, blockId) => set((0, immer_1.produce)((state) => {
        saveToHistory(state);
        if (!state.document)
            return;
        const page = state.document.pages.find((p) => p.id === pageId);
        if (page) {
            page.blocks = page.blocks.filter((b) => b.id !== blockId);
        }
    })),
    insertBlockBelow: (pageId, afterBlockId, type) => set((0, immer_1.produce)((state) => {
        saveToHistory(state);
        if (!state.document)
            return;
        const page = state.document.pages.find((p) => p.id === pageId);
        if (!page)
            return;
        const idx = page.blocks.findIndex((b) => b.id === afterBlockId);
        if (idx !== -1) {
            const newBlock = {
                id: `bk_ins_${Date.now()}`,
                type: type,
                props: {},
                slots: type === 'sectionHeader'
                    ? { eyebrow: 'SECTION EYEBROW', title: 'New Section Header' }
                    : type === 'textBlock'
                        ? { body: 'New paragraph block text.' }
                        : {},
            };
            page.blocks.splice(idx + 1, 0, newBlock);
        }
    })),
    updateBlockSlots: (pageId, blockId, slots) => set((0, immer_1.produce)((state) => {
        saveToHistory(state);
        if (!state.document)
            return;
        const page = state.document.pages.find((p) => p.id === pageId);
        if (!page)
            return;
        const findAndUpdate = (blocks) => {
            for (const b of blocks) {
                if (b.id === blockId) {
                    if (!b.slots)
                        b.slots = {};
                    Object.assign(b.slots, slots);
                    return true;
                }
                if (b.children) {
                    if (findAndUpdate(b.children))
                        return true;
                }
            }
            return false;
        };
        findAndUpdate(page.blocks);
    })),
    updateBlockStyle: (pageId, blockId, style) => set((0, immer_1.produce)((state) => {
        saveToHistory(state);
        if (!state.document)
            return;
        const page = state.document.pages.find((p) => p.id === pageId);
        if (!page)
            return;
        const findAndUpdateStyle = (blocks) => {
            for (const b of blocks) {
                if (b.id === blockId) {
                    if (!b.props)
                        b.props = {};
                    if (!b.props.style)
                        b.props.style = {};
                    Object.assign(b.props.style, style);
                    return true;
                }
                if (b.children) {
                    if (findAndUpdateStyle(b.children))
                        return true;
                }
            }
            return false;
        };
        findAndUpdateStyle(page.blocks);
    })),
}));
