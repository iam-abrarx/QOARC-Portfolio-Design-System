import React from 'react';
interface CommandPaletteProps {
    onClose: () => void;
    onSelectAction: (actionId: string) => void;
}
export declare const CommandPalette: React.FC<CommandPaletteProps>;
export {};
