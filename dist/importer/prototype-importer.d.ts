import { DesignSystem } from '../schemas/system.schema';
export declare function computeFileHash(filePath: string): string;
export declare function parseCssTokens(tokensCssContent: string): DesignSystem;
/**
 * Splits HTML code into root level elements/siblings.
 */
export declare function splitHtmlIntoChildren(html: string): string[];
export declare function importPrototypeProject(): string;
