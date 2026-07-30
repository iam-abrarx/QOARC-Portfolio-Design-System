/* ============================================================
   PROJECT LOADER
   Runs inside index.html, before panel.js. If the URL carries
   ?project=<slug> and that project exists in
   localStorage['qoarc.projects.v1'] (written by projects.html), this
   applies its color palette and fonts on top of the shipped QOARC
   defaults and exposes window.QO_PROJECT for panel.js to read.

   With no ?project= param, or an unknown slug, this is a no-op —
   the document renders exactly as it always has.
   ============================================================ */

(function () {
  const PROJECTS_KEY = 'qoarc.projects.v1';

  function loadProjects() {
    try { return JSON.parse(localStorage.getItem(PROJECTS_KEY)) || []; }
    catch { return []; }
  }

  function slugify(name) {
    return (name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'token';
  }

  const slug = new URLSearchParams(location.search).get('project');
  if (!slug) return;

  const project = loadProjects().find(p => p.slug === slug);
  if (!project) return;

  window.QO_PROJECT = project;

  if (document.title) document.title = `${project.name} — ${document.title}`;

  // ---- fonts --------------------------------------------------------
  // Any role (brand/technical/editorial) that names a Google Font gets a
  // combined <link> alongside the one index.html already ships; roles left
  // on a QOARC default need nothing extra, that face is already loaded.
  const fontVars = {};
  const googleFamilies = [];
  ['brand', 'technical', 'editorial'].forEach(role => {
    const f = project.fonts && project.fonts[role];
    if (!f || !f.css) return;
    fontVars[`--qo-font-${role === 'technical' ? 'mono' : role}`] = f.css;
    if (f.google) googleFamilies.push(f.google);
  });

  // ---- extra colors & extra font roles (add/remove tokens from the New
  // Project modal) — additive CSS custom properties, same style as the
  // base set above, not wired into deriveTokens()'s role math.
  (project.extraColors || []).forEach(c => {
    if (c.name && c.hex) fontVars[`--qo-custom-${slugify(c.name)}`] = c.hex;
  });
  (project.extraFonts || []).forEach(f => {
    if (!f.name || !f.font || !f.font.css) return;
    fontVars[`--qo-font-${slugify(f.name)}`] = f.font.css;
    if (f.font.google) googleFamilies.push(f.font.google);
  });

  if (googleFamilies.length) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?' +
      googleFamilies.map(f => `family=${f.replace(/ /g, '+')}`).join('&') +
      '&display=swap';
    document.head.appendChild(link);
  }

  // ---- colors ---------------------------------------------------------
  const derive = window.QOTokenDerive;
  const tokens = derive ? derive.deriveTokens(project.colors || {}) : null;

  const rootRules = tokens ? Object.entries({ ...tokens.root, ...fontVars })
    .map(([k, v]) => `${k}: ${v};`).join(' ') : Object.entries(fontVars).map(([k, v]) => `${k}: ${v};`).join(' ');
  const lightRules = tokens ? Object.entries(tokens.light).map(([k, v]) => `${k}: ${v};`).join(' ') : '';

  const style = document.createElement('style');
  style.id = 'qo-project-tokens';
  style.textContent = `:root { ${rootRules} }\n.qo-page--light { ${lightRules} }`;
  document.head.appendChild(style);
})();
