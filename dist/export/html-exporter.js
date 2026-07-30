"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportDocumentToHtml = exportDocumentToHtml;
function exportDocumentToHtml(doc, system) {
    const colors = system.tokens.color || {};
    const cssVariables = `
    :root {
      --qo-deep-space: ${colors.deepSpace?.$value || '#0A1830'};
      --qo-oxford-navy: ${colors.oxfordNavy?.$value || '#0F2244'};
      --qo-slate: ${colors.slate?.$value || '#6B7A94'};
      --qo-paper-white: ${colors.paperWhite?.$value || '#F7F7F9'};
      --qo-signal-teal: ${colors.signalTeal?.$value || '#2DD4BF'};
      --qo-teal: ${colors.signalTeal?.$value || '#2DD4BF'};
    }
  `;
    const pageHtml = doc.pages
        .map((page, idx) => {
        const isLight = page.theme === 'light';
        return `
    <section class="qo-page ${isLight ? 'qo-page--light' : ''}" id="${page.id}">
      <header class="qo-page__head">
        <span>${page.folio?.label || `Page ${idx + 1}`}</span>
        <span>QOARC Design System</span>
      </header>
      <div class="qo-page__body">
        <!-- Rendered blocks for page ${idx + 1} -->
      </div>
      <footer class="qo-page__foot">
        <span>${page.folio?.label || `Page ${idx + 1}`}</span>
        <span class="qo-page__num">${String(idx + 1).padStart(2, '0')}</span>
      </footer>
    </section>`;
    })
        .join('\n');
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${doc.title}</title>
  <link rel="stylesheet" href="css/tokens.css">
  <link rel="stylesheet" href="css/base.css">
  <link rel="stylesheet" href="css/components.css">
  <link rel="stylesheet" href="css/devices.css">
  <link rel="stylesheet" href="css/pages.css">
  <style>${cssVariables}</style>
</head>
<body>
${pageHtml}
</body>
</html>`;
}
