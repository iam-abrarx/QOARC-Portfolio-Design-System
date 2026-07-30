import { FolioDocument, Block } from '../../schemas/document.schema';
import { DesignSystem } from '../../schemas/system.schema';
import { ProjectManifest } from '../../schemas/project.schema';
export interface SelectionState {
    pageId: string;
    blockId: string;
    slotId?: string;
}
export interface FolioStoreState {
    project: ProjectManifest | null;
    system: DesignSystem | null;
    document: FolioDocument | null;
    selection: SelectionState | null;
    activeScreen: 'welcome' | 'builder';
    setActiveScreen: (screen: 'welcome' | 'builder') => void;
    past: FolioDocument[];
    future: FolioDocument[];
    undo: () => void;
    redo: () => void;
    setProject: (project: ProjectManifest) => void;
    setSystem: (system: DesignSystem) => void;
    setDocument: (doc: FolioDocument) => void;
    selectSlot: (selection: SelectionState | null) => void;
    updateSlotTransform: (pageId: string, blockId: string, transform: {
        x?: number;
        y?: number;
        z?: number;
    }) => void;
    assignSlotAsset: (pageId: string, blockId: string, assetPath: string) => void;
    updateTokenColor: (tokenKey: string, newValue: string) => void;
    addPage: (theme?: 'dark' | 'light') => void;
    removePage: (pageId: string) => void;
    reorderPage: (pageId: string, direction: 'up' | 'down') => void;
    updatePageLabel: (pageId: string, label: string) => void;
    updatePageTheme: (pageId: string, theme: 'dark' | 'light') => void;
    addBlockToPage: (pageId: string, block: Block) => void;
    removeBlock: (pageId: string, blockId: string) => void;
    insertBlockBelow: (pageId: string, afterBlockId: string, type: string) => void;
    updateBlockSlots: (pageId: string, blockId: string, slots: Record<string, any>) => void;
    updateBlockStyle: (pageId: string, blockId: string, style: Record<string, any>) => void;
}
export declare const useFolioStore: import("zustand").UseBoundStore<import("zustand").StoreApi<FolioStoreState>>;
