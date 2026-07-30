import React from 'react';
import { Block } from '../../../schemas/document.schema';
interface BlockRendererProps {
    block: Block;
    pageId: string;
}
export declare const BlockRenderer: React.FC<BlockRendererProps>;
export {};
