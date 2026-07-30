import { FolioDocument } from '../schemas/document.schema';
import { DesignSystem } from '../schemas/system.schema';
import { LintProblem } from '../lint/rule-engine';
export interface PreflightResult {
    passed: boolean;
    problems: LintProblem[];
    pageCount: number;
    dimensions: {
        width: string;
        height: string;
    };
}
export declare function runExportPreflight(doc: FolioDocument, system: DesignSystem): PreflightResult;
export declare function getPdfPrintOptions(): {
    preferCSSPageSize: boolean;
    printBackground: boolean;
    margins: {
        marginType: string;
    };
};
