import { FolioDocument } from '../schemas/document.schema';
import { DesignSystem } from '../schemas/system.schema';
export interface LintProblem {
    id: string;
    ruleId: string;
    severity: 'error' | 'warn' | 'info';
    message: string;
    pageId: string;
    blockId?: string;
}
export declare function evaluateDocumentRules(doc: FolioDocument, system: DesignSystem): LintProblem[];
