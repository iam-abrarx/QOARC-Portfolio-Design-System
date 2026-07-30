"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateDocumentRules = evaluateDocumentRules;
function evaluateDocumentRules(doc, system) {
    const problems = [];
    doc.pages.forEach((page, pIdx) => {
        // Rule 1: One accent per view
        let accentCount = 0;
        const countAccentsInBlocks = (blocks) => {
            for (const block of blocks) {
                if (block.props?.useAccent || block.props?.accent || block.slots?.accent) {
                    accentCount++;
                }
                if (block.children)
                    countAccentsInBlocks(block.children);
            }
        };
        countAccentsInBlocks(page.blocks);
        if (accentCount > 1) {
            problems.push({
                id: `prob_${page.id}_accent`,
                ruleId: 'one-accent-per-view',
                severity: 'warn',
                message: `Page ${pIdx + 1} (${page.folio?.label || page.id}) has ${accentCount} accent elements. Max permitted is 1.`,
                pageId: page.id,
            });
        }
        // Rule 2: Check for raw style overrides (no-raw-values)
        const checkRawValuesInBlocks = (blocks) => {
            for (const block of blocks) {
                if (block.props?.rawColor || block.props?.rawFontSize) {
                    problems.push({
                        id: `prob_${block.id}_raw`,
                        ruleId: 'no-raw-values',
                        severity: 'warn',
                        message: `Block ${block.id} uses an off-system hardcoded raw value (${block.props.rawColor || block.props.rawFontSize}).`,
                        pageId: page.id,
                        blockId: block.id,
                    });
                }
                if (block.children)
                    checkRawValuesInBlocks(block.children);
            }
        };
        checkRawValuesInBlocks(page.blocks);
    });
    return problems;
}
